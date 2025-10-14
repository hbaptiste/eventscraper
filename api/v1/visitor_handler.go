package api

import (
	"crypto/rand"
	"database/sql"
	internal "dpatrov/scraper/internal"
	"dpatrov/scraper/internal/db"
	"dpatrov/scraper/internal/db/repository"
	gendb "dpatrov/scraper/internal/gendb"
	"dpatrov/scraper/internal/utils"
	"dpatrov/scraper/internal/validators"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"reflect"
	"strconv"
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
	Status   string         `json:"status"`
}

type SubmissionConfirmationRequest struct {
	Token string
}

type DeletionRequest struct {
	Token string
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
		ID:                uuid.New().String(),
		Email:             "",
		Data:              jsonString,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		EditToken:         generateToken(),
		CancelToken:       generateToken(),
		ConfirmationToken: generateToken(),
		ExpiredAt:         time.Now().Add(7 * 24 * time.Hour), // / 7 jours
		Status:            "pending",
	}
}

func createFormParameters(formSubmission gendb.FormSubmission) *gendb.CreateFormSubmissionParams {
	return &gendb.CreateFormSubmissionParams{
		ID:                formSubmission.ID,
		Email:             formSubmission.Email,
		Data:              formSubmission.Data,
		CreatedAt:         formSubmission.CreatedAt,
		UpdatedAt:         formSubmission.UpdatedAt,
		EditToken:         formSubmission.EditToken,
		CancelToken:       formSubmission.CancelToken,
		ExpiredAt:         formSubmission.ExpiredAt,
		Status:            formSubmission.Status,
		ConfirmationToken: formSubmission.ConfirmationToken,
	}
}

func createErrorResponse(writer http.ResponseWriter, msg string, status int) {
	writer.WriteHeader(status)
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
		tokenStore := utils.GetCRSFTokenStore()
		if !tokenStore.ValidateToken(csrfToken) {
			createErrorResponse(writer, "Invalid CRSF token", http.StatusForbidden)
			return
		}

		switch req.Method {
		case http.MethodPost, http.MethodPut:
			// prevent time format error
			//var rowData Record
			var visitorRequest VisitorFormRequest

			err := json.NewDecoder(req.Body).Decode(&visitorRequest)
			if err != nil {
				fmt.Printf("<error> %v", err)
				createErrorResponse(writer, "Failed to read body", http.StatusBadRequest)
				return
			}

			_, issues := visitorRequest.isValid(validators.FormSubmissionSchema)
			if issues != nil {
				log.Printf("visitorRequest issues %v", issues)
				createErrorResponse(writer, "Invalid request", http.StatusUnprocessableEntity)
				return
			}
			// validate agenda entry
			err = visitorRequest.FormData.Validate()
			if err != nil {
				createErrorResponse(writer, "Invalid Agenda Form", http.StatusUnprocessableEntity)
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
			fmt.Printf("json:%+v", string(dataJson))
			// edit mode
			if visitorRequest.Token != "" { // edit
				err = services.queries.UpdateSubmissionStatus(req.Context(), gendb.UpdateSubmissionStatusParams{
					Status:    "pending",
					Data:      string(dataJson),
					EditToken: visitorRequest.Token,
				})
				// Remove the previous agenda entry if it exists
				/*err := services.agendaRepository.Delete(req.Context(), visitorRequest.ID)
				if err != nil && err != repository.ErrNoAgendaEntryFound {
					createErrorResponse(writer, "Error while removing linked agenda entry", http.StatusInternalServerError)
					return
				}*/
				agendaEntry, err := services.agendaRepository.FindByID(req.Context(), visitorRequest.ID)
				if err != nil && err != sql.ErrNoRows {
					createErrorResponse(writer, "Error while Updating linked agenda entry", http.StatusInternalServerError)
					return
				} else if agendaEntry.ID != "" {

					// linked agenda exists, put it offline
					err := services.agendaRepository.UpdateStatus(agendaEntry.ID, int(db.Status_Unlinked))
					if err != nil {
						fmt.Printf("<error>%v", err)
						createErrorResponse(writer, "Error while Updating linked agenda entry", http.StatusInternalServerError)
						return
					}
				}

			} else { // new
				submissionParams.Status = "unconfirmed"
				err = services.queries.CreateFormSubmission(req.Context(), *submissionParams)
				if err != nil {
					log.Printf("Error while Saving form %v", err)
					createErrorResponse(writer, "Error while Saving the form", http.StatusInternalServerError)
					return
				}
				err = services.mailer.SendMail("confirmation_email", submissionData.Email, "Afromémo - Confirmation de votre email", utils.Record{
					"Email":           submissionData.Email,
					"ConfirmationURL": fmt.Sprintf("%s/submission/%s/confirmation", os.Getenv("FRONT_URL"), submissionData.ConfirmationToken),
				})
				if err != nil {
					log.Printf("Error while sending the email: %v:", err)
					createErrorResponse(writer, "Error while Sending mail to user", http.StatusInternalServerError)
					return
				}
			}

			// send response
			writer.Header().Set("Content-Type", "application/json")
			json.NewEncoder(writer).Encode(Record{
				"success": true,
			})
			return
		default:
			createErrorResponse(writer, "Wrong Method", http.StatusBadRequest)
		}
	}

}

func fixPriceValue(submissionData gendb.FormSubmission) (gendb.FormSubmission, error) {
	var data Record
	err := json.Unmarshal([]byte(submissionData.Data), &data)
	if err != nil {
		return submissionData, err
	}
	if price, ok := data["price"]; ok {
		switch v := price.(type) {
		case float64:
			data["price"] = strconv.FormatFloat(v, 'f', 2, 64)
		}
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		return submissionData, nil
	}
	submissionData.Data = string(jsonData)
	return submissionData, nil
}

func getAllSubmissions(service *ServiceMiddleWare, writer http.ResponseWriter, req *http.Request) {

	submissions, err := service.queries.GetSubmissions(req.Context())
	if err != nil {
		writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
			Message: err.Error(),
		})
		return
	}
	response := make([]VisitorFormRequest, len(submissions))

	for _, submission := range submissions {
		var agenda db.AgendaEntry

		// translate first
		var data Record
		err := json.Unmarshal([]byte(submission.Data), &data)
		if err != nil {
			fmt.Printf("getAllSubmissionsError:: %v\n", err)
			writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
				Message: err.Error(),
			})
		}
		if price, ok := data["price"]; ok {
			switch v := price.(type) {
			case float64:
				data["price"] = strconv.FormatFloat(v, 'f', 2, 64)
			}
		}
		// remarshall
		jsonData, err := json.Marshal(data)
		if err != nil {
			writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
				Message: err.Error(),
			})
			return
		}
		err = json.Unmarshal(jsonData, &agenda)
		if err != nil {
			fmt.Printf("getAllSubmissionsError:: %v\n", err)
			continue
		}

		response = append(response, VisitorFormRequest{
			ID:       submission.ID,
			Token:    submission.EditToken,
			Email:    submission.Email,
			FormData: agenda,
			Status:   submission.Status,
		})
	}
	json.NewEncoder(writer).Encode(response)
}

func deleteSubmission(services *ServiceMiddleWare, writer http.ResponseWriter, req *http.Request) {
	var request DeletionRequest
	json.NewDecoder(req.Body).Decode(&request)

	if request.Token == "" {
		writeJSONResponse(writer, http.StatusBadRequest, ErrorResponse{
			Message: "Missing Token...",
		})
		return
	}
	submission, err := services.queries.GetSubmissionByToken(req.Context(), gendb.GetSubmissionByTokenParams{
		CancelToken: request.Token,
	})

	if err != nil {
		writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
			Message: "Submission not found",
		})
		return
	}
	// update status
	// Update submission state // send action email
	_ = services.queries.UpdateSubmissionStatus(req.Context(), gendb.UpdateSubmissionStatusParams{
		Status:    "deleted", // should be deleted later
		Data:      submission.Data,
		EditToken: submission.EditToken,
	})
	// deleted linked agenda
	err = services.agendaRepository.UpdateStatus(submission.ID, int(db.Status_Deleted))
	if err != nil && err != repository.ErrNoAgendaEntryFound {
		fmt.Sprintf("UpdateStatus::Error %s\n", err)
		createErrorResponse(writer, "Error while removing linked agenda entry", http.StatusInternalServerError)
		return
	}
	writeJSONResponse(writer, http.StatusOK, OkResponse{
		Message: fmt.Sprintf("Submission %s deleted", submission.ID),
	})

}
func ConfirmSubmission(services *ServiceMiddleWare) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, req *http.Request) {
		var request SubmissionConfirmationRequest

		if req.Method != http.MethodPost {
			writeJSONResponse(writer, http.StatusMethodNotAllowed, ErrorResponse{
				Message: "Wrong Method",
			})
			return
		}
		err := json.NewDecoder(req.Body).Decode(&request)
		if err != nil {
			writeJSONResponse(writer, http.StatusBadRequest, ErrorResponse{
				Message: err.Error(),
			})
			return
		}
		submission, err := services.queries.GetSubmissionByToken(req.Context(), gendb.GetSubmissionByTokenParams{
			ConfirmationToken: request.Token,
		})
		if err != nil {
			writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
				Message: err.Error(),
			})
			return
		}
		fmt.Println("Status %s", submission.Status)
		if submission.Status != "unconfirmed" {
			writeJSONResponse(writer, http.StatusOK, OkResponse{
				Message: "Already confirmed",
			})
			return
		}
		// validate confirmation token
		if time.Now().After(submission.CreatedAt.Add(24 * time.Hour)) {
			writeJSONResponse(writer, http.StatusUnauthorized, ErrorResponse{
				Message: "Validation Token expired",
			})
			return
		}

		// Update submission state // send action email
		_ = services.queries.UpdateSubmissionStatus(req.Context(), gendb.UpdateSubmissionStatusParams{
			Status:    "pending",
			Data:      submission.Data,
			EditToken: submission.EditToken,
		})
		// send action mail
		frontUrl := os.Getenv("FRONT_URL")
		err = services.mailer.SendMail("actions_email", submission.Email, "Afromémo - Gérer votre événement", utils.Record{
			"EditURL":   fmt.Sprintf("%s/agenda/public/%s/edit", frontUrl, submission.EditToken),
			"CancelURL": fmt.Sprintf("%s/agenda/public/%s/cancel", frontUrl, submission.CancelToken),
			"CreatedAt": submission.CreatedAt,
		})
		if err != nil {
			writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
				Message: "Error while sending email",
			})
			return
		}
		writeJSONResponse(writer, http.StatusOK, ErrorResponse{
			Message: "Ok",
		})

	}
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
						EditToken:         token,
						CancelToken:       token,
						ConfirmationToken: token,
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
				return
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
			return
		default:
			createErrorResponse(writer, "token is missing", http.StatusBadRequest)
			return
		}
	}
}

func GetSubmissionDiff(service *ServiceMiddleWare) func(http.ResponseWriter, *http.Request) {
	return func(writer http.ResponseWriter, req *http.Request) {
		// 1 get req
		if req.Method != http.MethodGet {
			writeJSONResponse(writer, http.StatusMethodNotAllowed, ErrorResponse{
				Message: "Method not allowed",
			})
			return
		}
		urlPart := strings.Split(req.URL.Path, "/")
		if len(urlPart) > 3 {
			submissionID := urlPart[4]
			agendaEntry, err := service.agendaRepository.FindByID(req.Context(), submissionID)

			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					result := make(map[string]Record)
					writeJSONResponse(writer, http.StatusAccepted, OkResponse{
						Data: result,
					})
					return
				} else {
					writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
						Message: "Internal Error",
					})
					return
				}
			}

			submission, err := service.queries.GetSubmissionByID(req.Context(), submissionID)
			if err != nil {
				writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
					Message: "Internal Error",
				})
				return
			}
			var submissionData db.AgendaEntry
			submission, err = fixPriceValue(submission)
			if err != nil {
				writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
					Message: "Internal Error",
				})
				return
			}
			err = json.Unmarshal([]byte(submission.Data), &submissionData)
			if err != nil {
				writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
					Message: "Internal Error",
				})
				return
			}
			// compare data here
			// get all keys
			// loop over key to compares
			reflectSubmissionData := reflect.ValueOf(submissionData)
			reflectAgenda := reflect.ValueOf(agendaEntry)

			numField := reflectAgenda.NumField()

			var result map[string]Record
			result = make(map[string]Record)
			for i := 0; i < numField; i++ {
				fieldNameA := reflectSubmissionData.Field(i)
				fieldNameB := reflectAgenda.Field(i)

				fieldName := reflectAgenda.Type().Field(i).Name
				fieldName = strings.ToLower(fieldName)

				if !reflect.DeepEqual(fieldNameA.Interface(), fieldNameB.Interface()) {

					result[fieldName] = Record{
						"old": fieldNameB.Interface(),
						"new": fieldNameA.Interface(),
					}
				}
			}
			writeJSONResponse(writer, http.StatusAccepted, OkResponse{
				Data: result,
			})
			return
		}
	}
}

// Handle Route
/*func EditForm(services *ServiceMiddleWare) func(http.ResponseController, *http.Request) {
	return func(writer http.ResponseWriter, resp *http.Request) {}
}*/
