package api

import (
	"crypto/rand"
	internal "dpatrov/scraper/internal"
	"dpatrov/scraper/internal/db"
	gendb "dpatrov/scraper/internal/gendb"
	"dpatrov/scraper/internal/utils"
	"dpatrov/scraper/internal/validators"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	z "github.com/Oudwins/zog"
	"github.com/google/uuid"
)

type Record = map[string]interface{}

type FormSubmissionWrapper struct {
	gendb.FormSubmission
}

type VisitorFormRequest struct {
	ID       string         `json:"id"`
	FormData db.AgendaEntry `json:"formData"`
	Email    string         `json:"email"`
	Token    string         `json:"token"`
}

func (vr *VisitorFormRequest) isValid(validator *z.StructSchema) (bool, z.ZogIssueMap) {
	issues := validator.Validate(vr)
	if issues != nil {
		return false, issues
	}
	return true, nil
}

func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// header with models
func (f *FormSubmissionWrapper) NewFromRequest(formRequest VisitorFormRequest) *gendb.FormSubmission {

	jsonString, err := formRequest.FormData.ToJSON()
	if err != nil {
		log.Fatalf("error %v", err)
	}
	return &gendb.FormSubmission{
		ID:          uuid.New().String(),
		Email:       "",
		Data:        jsonString,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		EditToken:   generateToken(),
		CancelToken: generateToken(),
		ExpiredAt:   time.Now().Add(7 * 24 * time.Hour), // / 7 jours
		Status:      "pending",
	}
}

func createFormParameters(formSubmission gendb.FormSubmission) *gendb.CreateFormSubmissionParams {
	return &gendb.CreateFormSubmissionParams{
		ID:          formSubmission.ID,
		Email:       formSubmission.Email,
		Data:        formSubmission.Data,
		CreatedAt:   formSubmission.CreatedAt,
		UpdatedAt:   formSubmission.UpdatedAt,
		EditToken:   formSubmission.EditToken,
		CancelToken: formSubmission.CancelToken,
		ExpiredAt:   formSubmission.ExpiredAt,
		Status:      formSubmission.Status,
	}
}

func createErrorResponse(writer http.ResponseWriter, msg string, status int) {
	json.NewEncoder(writer).Encode(Record{
		"Error":   true,
		"Message": msg,
	})
}

func HandlerVisitorForm(services *ServiceMiddleWare) func(http.ResponseWriter, *http.Request) {

	return func(writer http.ResponseWriter, req *http.Request) {
		// check token + rate
		clientIP := internal.GetClientIP(req)
		if !rateLimiter.Allow(clientIP) {
			createErrorResponse(writer, "Too many requests", http.StatusTooManyRequests)
			return
		}
		// Origin
		origin := req.Header.Get("Origin")
		allowedOrigin := os.Getenv("FRONT_URL")
		if origin != allowedOrigin {
			createErrorResponse(writer, "Invalid origin", http.StatusForbidden)
			return
		}

		// CSRF check
		csrfToken := req.Header.Get("X-CSRF-Token")
		fmt.Println(" CSRF Token:", csrfToken)
		tokenStore := utils.GetCRSFTokenStore()
		if !tokenStore.ValidateToken(csrfToken) {
			createErrorResponse(writer, "Invalid CRSF token", http.StatusForbidden)
			return
		}

		switch req.Method {
		case http.MethodPost, http.MethodPut:
			//prevent time format error
			var rowData Record
			var visitorRequest VisitorFormRequest

			err := json.NewDecoder(req.Body).Decode(&rowData)
			if err != nil {
				createErrorResponse(writer, "Failed to read body", http.StatusBadRequest)
				return
			}
			agendaMap := Record{
				"formData": rowData["formData"],
			}
			formData, err := json.Marshal(agendaMap)
			if err != nil {
				createErrorResponse(writer, "Failed to read agenda entry", http.StatusBadRequest)
				return
			}
			entry, err := db.UnmarshalAgendaEntry(formData) // useful for time format
			if err != nil {
				fmt.Printf("err %v", err)
				createErrorResponse(writer, "Failed to parse agenda entry", http.StatusBadRequest)
				return
			}
			// We update the entry
			rowData["formData"] = *entry

			// Convert to json
			rawRequestJson, err := json.Marshal(rowData)
			json.Unmarshal(rawRequestJson, &visitorRequest)
			if err != nil {
				fmt.Printf("err %v", err)
				createErrorResponse(writer, "Failed to parse agenda entry", http.StatusBadRequest)
				return
			}

			_, issues := visitorRequest.isValid(validators.FormSubmissionSchema)
			if issues != nil {
				log.Printf("visitorRequest issues %v", issues)
				createErrorResponse(writer, "Invalid request", http.StatusUnprocessableEntity)
				return
			}
			// if update email should not changed
			if visitorRequest.Token != "" {
				previousSubmission, err := services.queries.GetSubmissionByToken(req.Context(), gendb.GetSubmissionByTokenParams{
					EditToken: visitorRequest.Token,
				})

				if err != nil {
					fmt.Printf("%+v", err)
					createErrorResponse(writer, "Missing Submission or Wrong token", http.StatusInternalServerError)
					return
				}

				if previousSubmission.Email != visitorRequest.Email {
					createErrorResponse(writer, "Email missmatched", http.StatusUnprocessableEntity)
					return
				}
			}

			// steps - validate email - generate delete / edit token
			fw := FormSubmissionWrapper{FormSubmission: gendb.FormSubmission{}}
			submissionData := fw.NewFromRequest(visitorRequest)
			submissionData.Email = visitorRequest.Email

			// create or update Submission
			var submissionParams = createFormParameters(*submissionData)
			dataJson, err := json.Marshal(visitorRequest.FormData)

			//
			if visitorRequest.Token != "" {
				err = services.queries.UpdateSubmissionStatus(req.Context(), gendb.UpdateSubmissionStatusParams{
					Status:    "pending",
					Data:      string(dataJson),
					EditToken: visitorRequest.Token,
				})
			} else {
				err = services.queries.CreateFormSubmission(req.Context(), *submissionParams)
			}
			if err != nil {
				log.Printf("Error while Saving form %v", err)
				createErrorResponse(writer, "Error while Saving the form", http.StatusInternalServerError)
				return
			}

			// send mail service
			err = services.mailer.SendConfirmationMail(submissionData)
			if err != nil {
				log.Printf("Error while sending the file: %v:", err)
				return
			}
			// send response
			writer.Header().Set("Content-Type", "application/json")
			json.NewEncoder(writer).Encode(Record{
				"Success": true,
			})
			return
		default:
			createErrorResponse(writer, "Wrong Method", http.StatusBadRequest)
		}
	}

}

func getAllSubmissions(service *ServiceMiddleWare, writer http.ResponseWriter, req *http.Request) {

	submissions, err := service.queries.GetSubmissions(req.Context())
	if err != nil {
		writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
			Message: err.Error(),
		})
	}
	response := make([]VisitorFormRequest, len(submissions))

	for _, submission := range submissions {
		var agenda db.AgendaEntry
		err := json.Unmarshal([]byte(submission.Data), &agenda)
		if err != nil {
			fmt.Printf("getAllSubmissions:: %v", err)
			continue
		}

		response = append(response, VisitorFormRequest{
			ID:       submission.ID,
			Token:    submission.EditToken,
			Email:    submission.Email,
			FormData: agenda,
		})
	}
	json.NewEncoder(writer).Encode(response)
}

func deleteSubmission(services *ServiceMiddleWare, response http.ResponseWriter, req *http.Request) {
	// >> by admin
}

func SubmissionHandler(services *ServiceMiddleWare) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, req *http.Request) {
		switch req.Method {
		case http.MethodGet:
			writer.Header().Set("Content-Type", "application/json")
			urlPaths := strings.Split(req.URL.Path, "/")
			if len(urlPaths) > 3 {
				token := urlPaths[3]
				if token != "" {
					submission, err := services.queries.GetSubmissionByToken(req.Context(), gendb.GetSubmissionByTokenParams{
						EditToken: token,
					})
					if err != nil {
						fmt.Printf("SubmissionHandler::%v\n", err)
						writeJSONResponse(writer, http.StatusUnprocessableEntity, ErrorResponse{
							Message: "Submission not found",
						})
						return
					}
					var agenda db.AgendaEntry
					_ = json.Unmarshal([]byte(submission.Data), &agenda)
					// Format times

					response := VisitorFormRequest{
						ID:       submission.ID,
						Token:    submission.EditToken,
						Email:    submission.Email,
						FormData: agenda,
					}
					json.NewEncoder(writer).Encode(response)
				}
			} else {
				getAllSubmissions(services, writer, req)

			}

		case http.MethodPost:
			var fromRequest VisitorFormRequest
			err := json.NewDecoder(req.Body).Decode(fromRequest)
			if err != nil {
				writeJSONResponse(writer, http.StatusAccepted, ErrorResponse{
					Message: err.Error(),
				})
				return
			}
			// Update Submission from edit_token
			// should work for both for admin or bare user
			urlPaths := strings.Split(req.URL.Path, "/")
			if len(urlPaths) < 3 {
				createErrorResponse(writer, "token is missing", http.StatusBadRequest)
				return
			}
			token := urlPaths[3]
			submission, err := services.queries.GetSubmissionByToken(req.Context(), gendb.GetSubmissionByTokenParams{
				EditToken: token,
			})
			if err != nil {
				fmt.Printf("%v", err)
				createErrorResponse(writer, "Submission not Found", http.StatusBadRequest)
				return
			}
			// var entry db.AgendaEntry
			var data map[string]interface{}
			err = json.Unmarshal([]byte(submission.Data), &data)
			if err != nil {
				fmt.Printf("&v", err)
				createErrorResponse(writer, "Misformed submission", http.StatusUnprocessableEntity)
				return
			}
			json.NewEncoder(writer).Encode(Record{
				"submission": data,
				"email":      submission.Email,
			})

		case http.MethodDelete:
			// Update Submission from delete_token
			deleteSubmission(services, writer, req)
		default:
			createErrorResponse(writer, "token is missing", http.StatusBadRequest)
			return
		}
	}
}

// Handle Route
/*func EditForm(services *ServiceMiddleWare) func(http.ResponseController, *http.Request) {
	return func(writer http.ResponseWriter, resp *http.Request) {}
}*/
