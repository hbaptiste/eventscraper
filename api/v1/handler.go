package api

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/db"
	"dpatrov/scraper/internal/db/repository"
	"dpatrov/scraper/internal/gendb"
	"dpatrov/scraper/internal/types"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	internal "dpatrov/scraper/internal"

	"dpatrov/scraper/internal/utils"

	"dpatrov/scraper/internal/validators"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// rate limiter
var rateLimiter = utils.NewRateLimiter(5, time.Minute)

// JWT claims
type AccessClaims struct {
	UserID int    `json:"user_id"`
	Nonce  string `json:"nonce"`
	jwt.RegisteredClaims
}

// RefreshClaims
type RefreshClaims struct {
	UserID int    `json:"user_id"`
	Type   string `json:"type"`
	jwt.RegisteredClaims
}

// User request
type LoginRequest struct {
	UserName string `json:"username"`
	Password string `json:"password"`
}

type JWTResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	Expires      int64  `json:"expires"`
}
type AgendaStatusRequest struct {
	Id     string `json:"id"`
	Status int    `json:"status"`
}

type ErrorResponse struct {
	Response
	Message string `json:"message"`
	Error   bool   `json:"error"`
}

type PublishActionRequest struct {
	FormData db.AgendaEntry `json:"formData"`
	Action   string         `json:"action"`
	Token    string         `json:"token"`
}

type Response interface {
	IsResponse() bool
}

type BaseResponse struct{}

func (r BaseResponse) IsResponse() bool { return true }

type OkResponse struct {
	BaseResponse
	Message string      `json:"message"`
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

type CSRFTokenResponse struct {
	BaseResponse
	CSRFToken string `json:"csrf_token"`
}

func writeJSONResponse(w http.ResponseWriter, statusCode int, response Response) {
	// Type Assertion
	requestID := uuid.New().String()
	if errResponse, ok := response.(ErrorResponse); ok {
		errResponse.Error = true
		log.Printf("Error:[%s] [%s]", requestID, errResponse.Message)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	json.NewEncoder(w).Encode(response)
}

type HandlerFunc = func(http.ResponseWriter, *http.Request)

type contextKey string

const (
	agendaRepoKey = contextKey("agendaRepo")
	taskRepoKey   = contextKey("taskRepository")
	userIDKey     = contextKey("userIDKey")
	userRepoKey   = contextKey("userRepository")
	serviceKey    = contextKey("service")
)

// JWT token session
var (
	jwtKey        []byte
	jwtRefreshKey []byte
	jwtTimout     = 15 * time.Minute
	token         *jwt.Token
)

type ServiceMiddleWare struct {
	agendaRepository repository.AgendaRepository
	taskRepository   repository.TaskRepository
	userRepository   repository.UserRepository
	queries          gendb.Queries
	mailer           utils.Mailer
}

func NewServiceMiddleWare(db *sql.DB) *ServiceMiddleWare {
	mailerConf := utils.MailerConf{
		SmtpHost:     "mail.infomaniak.com",
		SmtpUser:     "info@afromemo.ch",
		SmtpPort:     "465",
		SmtpPassword: os.Getenv("SMTP_PASSWORD"),
		BaseUrl:      os.Getenv("FRONT_URL"),
		FromEmail:    "info@afromemo.ch",
	}
	return &ServiceMiddleWare{
		agendaRepository: *repository.NewAgendaRepository(db),
		taskRepository:   *repository.NewTaskRepository(db),
		userRepository:   *repository.NewUserRepository(db),
		queries:          *gendb.New(db),
		mailer:           *utils.NewMailer(mailerConf),
	}
}

func (m *ServiceMiddleWare) Handler(next http.HandlerFunc) HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		// ADD into context
		ctx := context.WithValue(req.Context(), agendaRepoKey, m.agendaRepository)
		ctx = context.WithValue(ctx, taskRepoKey, m.taskRepository)
		ctx = context.WithValue(ctx, userRepoKey, m.userRepository)
		ctx = context.WithValue(ctx, serviceKey, m.queries)
		// Call next handler with context
		next.ServeHTTP(resp, req.WithContext(ctx))
	}
}

/*
 */
func GenerateAccessToken(userID int) (string, error) {

	now := time.Now()
	claims := &AccessClaims{
		UserID: userID,
		Nonce:  fmt.Sprintf("%d", now.UnixNano()),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			Issuer:    "afromemo",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func GenerateRefeshToken(ctx context.Context, userID int) (string, error) {
	now := time.Now()
	claim := &RefreshClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			Issuer:    "afromemo",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claim)
	signedToken, err := token.SignedString(jwtRefreshKey)
	if err != nil {
		errors.New("Error while creating refresh token!")
	}

	value := ctx.Value(serviceKey)
	services, ok := value.(*ServiceMiddleWare)
	if !ok {
		log.Printf("error %v", serviceKey)
		return "", errors.New("here: Service MiddleWare not found!")
	}
	// Persist save refresh token
	err = services.queries.CreateRefreshToken(ctx, gendb.CreateRefreshTokenParams{
		UserID:    int64(userID),
		ExpiresAt: claim.ExpiresAt.Time,
		Token:     signedToken,
	})

	if err != nil {
		log.Println("%v", err)
		return "", errors.New("Error while creating refesh Token")
	}
	return signedToken, nil
}

func ValidateRefreshToken(context context.Context, userID int, refreshToken string) (bool, error) {
	/* Parse and valid refresh token */
	token, err := jwt.ParseWithClaims(refreshToken, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtRefreshKey), nil
	})
	if err != nil {
		return false, err
	}
	if claims, ok := token.Claims.(*RefreshClaims); ok && token.Valid {
		// check claim
		value := context.Value(serviceKey)
		services, ok := value.(*ServiceMiddleWare)
		if !ok {
			return false, errors.New("Service MiddleWare not found!")
		}
		_, err := services.queries.GetRefreshToken(context, gendb.GetRefreshTokenParams{
			UserID: int64(claims.UserID),
			Token:  refreshToken,
		})
		if err != nil {
			log.Printf("GetRefreshToken Error %v", err)
			return false, errors.New("Refesh token not found")
		}
		return true, nil
	}
	return false, errors.New("Invalid Refresh Token!")
}

func loginWithServices(sc *ServiceMiddleWare) http.HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		ctx := context.WithValue(req.Context(), serviceKey, sc)
		req.WithContext(ctx)
		// handle Post Request only
		if req.Method != http.MethodPost {
			writeJSONResponse(resp, http.StatusMethodNotAllowed, ErrorResponse{
				Message: "Method not allowed",
			})
			return
		}
		var logReq LoginRequest
		if err := json.NewDecoder(req.Body).Decode(&logReq); err != nil {
			writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
				Error:   true,
				Message: "Invalid request",
			})
			return
		}
		user, err := sc.userRepository.FindByName(req.Context(), logReq.UserName)
		if err != nil {
			log.Printf("%v", err)
			writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
				Error:   true,
				Message: "Invalid credentials: wrong username or password",
			})
			return
		}
		// check  password
		//password, err := bcrypt.GenerateFromPassword([]byte(logReq.Password), bcrypt.DefaultCost)
		log.Printf("user:%s, provided: %s", logReq.Password)
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(logReq.Password))
		if err != nil {
			writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
				Error:   true,
				Message: "Invalid credentials",
			})
			return
		}
		expirationTime := time.Now().Add(jwtTimout)

		// Access claims
		tokenString, err := GenerateAccessToken(user.ID)
		if err != nil {
			writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{Error: true, Message: "Failed to generate token"})
			return
		}
		// refreshClaims
		refreshToken, err := GenerateRefeshToken(ctx, user.ID)
		if err != nil {
			log.Printf("Error: Failed to generate refreshToken %v", err)
			writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{Error: true, Message: "Failed to generate token"})
			return
		}
		log.Printf("Generated refreshtoken %s", refreshToken) // save refresh token to cookie
		http.SetCookie(resp, &http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteLaxMode,
			Path:     "/",
			MaxAge:   7 * 24 * 3600,
		})
		// Return token
		response := JWTResponse{
			Token:   tokenString,
			Expires: expirationTime.Unix(),
		}
		// Headers
		json.NewEncoder(resp).Encode(response)
	}
}

func refeshTokenWithServices(sc *ServiceMiddleWare) http.HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
				Message: "Method not allowed",
			})
			return
		}
		// request
		ctx := context.WithValue(req.Context(), serviceKey, sc)
		req.WithContext(ctx)

		cookie, err := req.Cookie("refresh_token")
		if err != nil {
			log.Printf("cookie error: %v", err)
			writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
				Message: "refresh_token cookie is missing",
			})
			return
		}
		refreshToken := cookie.Value
		token, err := jwt.ParseWithClaims(refreshToken, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtRefreshKey), nil
		})
		if err != nil {
			log.Printf("error %v", err)
			// clean previous token
			http.SetCookie(resp, &http.Cookie{
				Name:   "refresh_token",
				Value:  "",
				MaxAge: -1,
			})
			writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
				Message: "Invalid refresh token",
			})
			return
		}
		if claims, ok := token.Claims.(*RefreshClaims); ok && token.Valid {
			_, err = ValidateRefreshToken(ctx, claims.UserID, refreshToken)
			if err != nil {
				log.Printf("error %v", err)
				writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
					Message: "Invalid refresh token",
				})
				return
			}
			log.Printf("Refresh Token is valid...")
			log.Printf("Generating a new access Token...")
			accessToken, err := GenerateAccessToken(claims.UserID)
			if err != nil {
				log.Printf("Error while generating access token %v", err)
				writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
					Message: "Invalid access Token",
				})
				return
			}
			log.Printf("new Access Token Generated...%s", accessToken)
			response := JWTResponse{
				Token:   accessToken,
				Expires: int64(10 * time.Minute),
			}
			// @todo Update cookies with new refesh token rotation
			json.NewEncoder(resp).Encode(response)
			return
		}

		writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
			Message: "Invalid token provided",
		})

	}
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		// CORS
		if req.Method == "OPTIONS" {
			resp.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONT_URL")) // Or your specific origin
			resp.Header().Set("Access-Control-Allow-Credentials", "true")
			resp.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			resp.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Custom-HEADER")
			resp.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight for 24 hours
			resp.WriteHeader(http.StatusOK)
			return
		}

		authHeader := req.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
				Message: "Authorization required",
				Error:   true,
			})
			return
		}
		// token extraction
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse the token
		claims := &AccessClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil || !token.Valid {
			fmt.Printf("Access Claim Error %v", err)
			writeJSONResponse(resp, http.StatusUnauthorized, ErrorResponse{
				Message: "Invalid or expired token",
			})
			return
		}
		ctx := context.WithValue(req.Context(), userIDKey, claims.UserID)
		next.ServeHTTP(resp, req.WithContext(ctx))
	})
}

func getUserHandlerWithServices(sv *ServiceMiddleWare) HandlerFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		username := req.URL.Query().Get("username")
		if len(username) == 0 {
			http.Error(resp, "ID user is missing!", http.StatusBadRequest)
			return
		}
		user, err := sv.userRepository.FindByName(ctx, username)
		if err != nil {
			http.Error(resp, fmt.Sprintln("Error while finding user username %v", err), http.StatusBadRequest)
			return
		}

		resp.Header().Set("Content-Type", "application/json")
		json.NewEncoder(resp).Encode(user)
	}
}

func withCORS(handler HandlerFunc) HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONT_URL")) // Or your specific origin
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// preflight
		if req.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		log.Printf("REQ: %s", req.URL)
		handler(w, req)
	}
}

func GetRepository[T any](ctx context.Context, key contextKey) (T, error) {
	value := ctx.Value(key)
	if value == nil {
		var zero T
		return zero, fmt.Errorf("repository of type %T not found in context", zero)
	}
	repo, ok := value.(T)
	if !ok {
		var zero T
		return zero, fmt.Errorf("context value in not of Type %T")
	}
	return repo, nil
}

func getAllEvents(resp http.ResponseWriter, req *http.Request) {
	agendaRepo, err := GetRepository[repository.AgendaRepository](req.Context(), agendaRepoKey)
	if err != nil {
		http.Error(resp, "Fail to get agenda repository", http.StatusInternalServerError)
	}
	/* Check token in the context */
	queryFilter := make(map[string]int)
	queryFilter["status"] = 1

	userId := req.Context().Value(userIDKey)
	log.Printf("Current userId %d", userId)
	if userId != nil {
		userRepo, err := GetRepository[repository.UserRepository](req.Context(), userRepoKey)
		if err != nil {
			http.Error(resp, "Fail to get user repository", http.StatusInternalServerError)
			return
		}
		user, err := userRepo.FindByID(req.Context(), userId.(int))
		if err != nil {
			log.Printf("Fail to get user with id %d: %v", userId.(int), err)
			writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
				Message: "Internal Error.",
				Error:   true,
			})
			return
		}
		if user.IsAdmin() {
			queryFilter = nil // return everything
		} else {
			queryFilter["owner"] = userId.(int)
		}
	}

	events, err := agendaRepo.FindAll(req.Context(), queryFilter)
	if err != nil {
		fmt.Printf("err %v", err)
		log.Fatalf("%v", err)
		http.Error(resp, "Fail to load events", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(resp).Encode(events)
}

// status handler
func agendaStatusHandler(resp http.ResponseWriter, req *http.Request) {
	id := strings.TrimPrefix(req.URL.Path, "/agenda/")
	if id == "" {
		log.Printf("Query %s", req.URL.Path)
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Message: "agenda entry ID is required",
		})
		return
	}

	agendaEntry, err := GetRepository[repository.AgendaRepository](req.Context(), agendaRepoKey)
	if err != nil {
		log.Printf("Internal error %w", err)
		writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
			Message: "Internal Error",
		})
	}
	var statusRequest AgendaStatusRequest
	err = json.NewDecoder(req.Body).Decode(&statusRequest)
	log.Printf("Query Param: %v", statusRequest)
	if err != nil {
		log.Printf("Bad Request %v", err)
		writeJSONResponse(resp, http.StatusUnprocessableEntity, ErrorResponse{
			Message: "Bad request",
		})
		return
	}
	// deal with current user form token
	if err := agendaEntry.UpdateStatus(statusRequest.Id, statusRequest.Status); err != nil {
		log.Printf("Internal Error while updated Status %v", err)
		writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
			Message: "Internal Error while updated Status",
		})
		return
	}
	writeJSONResponse(resp, http.StatusAccepted, OkResponse{
		Message: "Status updated",
	})
	log.Printf("Status update for entry %s!", statusRequest)
}

func handlePoster(agendaEntry *db.AgendaEntry) {
	if strings.HasPrefix(agendaEntry.Poster, "/tmp/") {
		tmpPoster, err := os.Open(agendaEntry.Poster)
		if err != nil {
			log.Printf("Failed to open file %s", agendaEntry.Poster)
			agendaEntry.Poster = "" // reset the path, let the front handle that
		} else {
			defer tmpPoster.Close()
			if dir, err := os.Getwd(); err == nil {
				newFilename := internal.TransformPosterName(filepath.Base(tmpPoster.Name()))
				dest := filepath.Join(dir, "uploads", newFilename)

				// use copy
				log.Printf("Created file %s!", dest)
				destFile, err := os.Create(dest)
				if err != nil {
					log.Printf("Error while creating file %v", err)
					return
				}
				defer destFile.Close()
				// copy
				_, err = io.Copy(destFile, tmpPoster)
				if err != nil {
					log.Printf("Error while coping %s to %s, %v !", tmpPoster.Name(), destFile.Name(), err)
					return
				}
				os.Remove(tmpPoster.Name())
				agendaEntry.Poster = filepath.Base(dest)

			}
		}
	}
}
func createAgendaEntry(req *http.Request, agendyEntry *db.AgendaEntry) (bool, error) {
	agendaRepository, err := GetRepository[repository.AgendaRepository](req.Context(), agendaRepoKey)
	if err != nil {
		return false, err
	}
	_, err = agendaRepository.Create(req.Context(), agendyEntry)
	if err != nil {
		fmt.Printf("createAgendaEntry::%v")
		return false, errors.New("Failed to create new entry")
	}
	return true, nil
}

func agendaHandler(resp http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		urlPaths := strings.Split(req.URL.Path, "/")
		if len(urlPaths) > 3 {
			agendaID := urlPaths[3]
			if agendaID != "" {
				agendaRepo, err := GetRepository[repository.AgendaRepository](req.Context(), agendaRepoKey)
				if err != nil {
					http.Error(resp, "Fail to get agenda repository", http.StatusInternalServerError)
				}
				agendaEntry, err := agendaRepo.FindByID(req.Context(), agendaID)
				if err != nil {
					writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
						Message: err.Error(),
					})
				}

				dataJSON, err := agendaEntry.ToJSON()
				if err != nil {
					writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
						Message: err.Error(),
					})
					return
				}
				resp.Write([]byte(dataJSON))
			}
		} else {
			getAllEvents(resp, req)
		}

	case http.MethodPost:
		var agendaEntry db.AgendaEntry
		err := json.NewDecoder(req.Body).Decode(&agendaEntry)
		if err != nil {
			writeJSONResponse(resp, http.StatusUnprocessableEntity, ErrorResponse{
				Message: "Bad request",
				Error:   true,
			})
			return
		}
		// Persist - BUILD AN INJECTOR
		handlePoster(&agendaEntry)
		_, err = createAgendaEntry(req, &agendaEntry)
		if err != nil {
			return
		}
		json.NewEncoder(resp).Encode(agendaEntry)
	case http.MethodPatch:
		agendaStatusHandler(resp, req)
	case http.MethodPut:
		var agendaEntry db.AgendaEntry
		err := json.NewDecoder(req.Body).Decode(&agendaEntry)
		fmt.Printf("recieved data %+v", agendaEntry)

		if err != nil {
			log.Printf("error %v", err)
			writeJSONResponse(resp, http.StatusUnprocessableEntity, ErrorResponse{
				Message: "Bad request: Unprocessable entity",
				Error:   true,
			})
			return
		}
		// get Repo
		agendaRepository, err := GetRepository[repository.AgendaRepository](req.Context(), agendaRepoKey)
		if err != nil {
			writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
				Message: "Failed to get entity",
				Error:   true,
			})
			return
		}
		// Deal with poster
		handlePoster(&agendaEntry)
		err = agendaRepository.Update(req.Context(), agendaEntry)
		if err != nil {
			writeJSONResponse(resp, http.StatusInternalServerError, ErrorResponse{
				Message: "Failed to update entity",
				Error:   true,
			})
			return
		}
		writeJSONResponse(resp, http.StatusAccepted, OkResponse{
			Data:    "Entity updated",
			Success: true,
		})

	default:
		fmt.Fprintf(resp, "Method %s not allowed", req.Method)
	}
}

func taskHandler(resp http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(resp, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var scrapingRequest types.ScrapingTask
	err := json.NewDecoder(req.Body).Decode(&scrapingRequest)
	if err != nil {
		http.Error(resp, "Bad request", http.StatusBadRequest)
	}
	fmt.Println(scrapingRequest)
}

func healthHandler(resp http.ResponseWriter, req *http.Request) {
	fmt.Printf("You better know what's going on...")
	ctx := req.Context()
	idUser := ctx.Value(userIDKey)
	if idUser != nil {
		fmt.Errorf("ID user is mising")
	}
	value, ok := idUser.(string)
	if !ok {
		fmt.Errorf("context value in not of Type %s")
	}
	fmt.Printf("UserId is %s", value)
	resp.Write([]byte("server is running!"))
}

func uploadHandler(resp http.ResponseWriter, req *http.Request) {

	if req.Method != "POST" {
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "Method not allowed",
		})
		return
	}
	// 5 MB
	err := req.ParseMultipartForm(5 << 10)
	if err != nil {
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "File must be less then 5MB",
		})
		return
	}

	file, handler, err := req.FormFile("file")
	if err != nil {
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "Failed to retrieve file",
		})
		return
	}
	defer file.Close()

	// save file to tmp
	tmpPath, err := os.CreateTemp("/tmp", "poster*")
	if err != nil {
		log.Println("Error while creating a tmp file", err)
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "Error while creating a tmp file",
		})
		return
	}
	newFilepath := filepath.Join("/tmp", handler.Filename)
	// Rename
	// defer os.Remove(tmpPath.Name())
	// Copy file contents
	_, err = io.Copy(tmpPath, file)
	if err != nil {
		log.Println("Error while saving the file %v", err)
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "Failed to save file",
		})
		return
	}

	err = os.Rename(tmpPath.Name(), newFilepath)
	if err != nil {
		log.Printf("Failed to rename temporary file from %s to %s: %v", tmpPath.Name(), newFilepath, err)
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "Failed to rename temporary file",
		})
		return
	}

	writeJSONResponse(resp, http.StatusOK, OkResponse{
		Success: true,
		Data: map[string]string{
			"filename": newFilepath,
			"size":     fmt.Sprintf("%d bytes", handler.Size),
		},
	})
}

func AdminActionHandler(service *ServiceMiddleWare) HandlerFunc {
	return func(writer http.ResponseWriter, req *http.Request) {
		var actionRequest PublishActionRequest
		err := json.NewDecoder(req.Body).Decode(&actionRequest)
		if err != nil {
			fmt.Printf("AdminActionHandler::Error %v", err)
			writeJSONResponse(writer, http.StatusUnprocessableEntity, ErrorResponse{Message: "Unprocessable entity"})
			return
		}
		if actionRequest.Action == "" {
			writeJSONResponse(writer, http.StatusBadRequest, ErrorResponse{Message: "Action is missing"})
			return
		}

		if actionRequest.Action == "publish" {
			formSubmission, err := service.queries.GetSubmissionByToken(req.Context(), gendb.GetSubmissionByTokenParams{EditToken: actionRequest.Token})
			if err != nil {
				log.Printf("GetSubmissionByToken: %v", err)
				writeJSONResponse(writer, http.StatusUnprocessableEntity, ErrorResponse{Message: "Submission Not found"})
				return
			}
			agendaEntry := actionRequest.FormData
			issues := validators.AgendaEntrySchema.Validate(&agendaEntry)
			if issues != nil {
				log.Printf("%v", issues)
				writeJSONResponse(writer, http.StatusUnprocessableEntity, ErrorResponse{Message: "Form is not valid"})
				return
			}
			// Deal with poster // if it has changed
			handlePoster(&agendaEntry)
			// We keep the same submission ID && update status
			agendaEntry.ID = formSubmission.ID
			agendaEntry.Status = db.Status_Active

			// We update submission status with the updated data
			agendaEntryData, err := json.Marshal(agendaEntry)
			if err != nil {
				log.Printf("%v", err)
				writeJSONResponse(writer, http.StatusUnprocessableEntity, ErrorResponse{Message: err.Error()})
				return
			}
			// We try to find the agenda item
			agenda, err := service.agendaRepository.FindByID(req.Context(), formSubmission.ID)
			if !agenda.IsZero() {
				service.agendaRepository.Update(req.Context(), agendaEntry)
			} else {
				// Create a new agenda entry
				_, err = service.agendaRepository.Create(req.Context(), &agendaEntry)
				if err != nil {
					fmt.Printf("error::createAgendaEntry %v", err)
					writeJSONResponse(writer, http.StatusInternalServerError, ErrorResponse{
						Message: err.Error(),
					})
					return
				}
			}
			service.queries.UpdateSubmissionStatus(req.Context(), gendb.UpdateSubmissionStatusParams{
				Status:    "active",
				Data:      string(agendaEntryData),
				EditToken: formSubmission.EditToken,
			})

			// notify user
			frontUrl := os.Getenv("FRONT_URL")
			err = service.mailer.SendMail("submission_accepted", formSubmission.Email, "Afromémo - Publication de votre événement", utils.Record{
				"EditURL":    fmt.Sprintf("%s/agenda/public/%s/edit", frontUrl, formSubmission.EditToken),
				"CancelURL":  fmt.Sprintf("%s/agenda/public/%s/cancel", frontUrl, formSubmission.CancelToken),
				"DetailURL":  fmt.Sprintf("%s/agenda/%s", frontUrl, formSubmission.ID),
				"EventTitle": agendaEntry.Title,
			})

			writeJSONResponse(writer, http.StatusOK, OkResponse{
				Message: "ok",
			})
		}
	}
}

// creation du token store
var crsfToken = utils.GetCRSFTokenStore()

func csrfTokenHandler(resp http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		writeJSONResponse(resp, http.StatusBadRequest, ErrorResponse{
			Error:   true,
			Message: "Wrong method",
		})
		return
	}

	token := crsfToken.GenerateToken()
	resp.Header().Set("Content-Type", "application/json")
	writeJSONResponse(resp, http.StatusAccepted, CSRFTokenResponse{
		CSRFToken: token,
	})
}

func StartApiServer(portNumber int) {
	// check key
	encodedKey := os.Getenv("JWT_SECRET_KEY")
	if encodedKey == "" {
		log.Fatalln("JWT_SECRET_KEY env variable is not set")
	}
	encodedRefKey := os.Getenv("JWT_REFRESH_KEY")
	// key is base64 encode
	var err error
	jwtKey, err = base64.StdEncoding.DecodeString(encodedKey)
	if err != nil {
		log.Fatalln("JWT_KEY is not base64 encoded")
	}
	jwtRefreshKey, err = base64.StdEncoding.DecodeString(encodedRefKey)
	if err != nil {
		log.Fatalln("JWT_REFRESH_KEY is not base64 encoded")
	}
	FRONT_URL := os.Getenv("FRONT_URL")
	if FRONT_URL == "" {
		log.Fatalf("FRONT_URL env variable is not set")
	}

	// init DB
	localDb := db.InitDb() // change to command

	// Handle Migration
	db.ApplyMigration(localDb)

	serviceMiddleWare := NewServiceMiddleWare(localDb)
	agendaHandler := serviceMiddleWare.Handler(agendaHandler)
	loginHandler := withCORS(loginWithServices(serviceMiddleWare))

	//refresh token handler
	refreshTokenHandler := withCORS(refeshTokenWithServices(serviceMiddleWare))

	// <mux>
	mux := http.NewServeMux()
	//
	tmpImgServer := NewTmpFileServer("/tmp")
	// auth routes
	mux.HandleFunc("/api/login", loginHandler)
	mux.HandleFunc("/api/health", healthHandler)
	mux.HandleFunc("/api/refreshToken", refreshTokenHandler)
	mux.HandleFunc("/api/agenda/", withCORS(agendaHandler))
	mux.HandleFunc("/api/agenda", withCORS(agendaHandler))

	// token
	mux.HandleFunc("/api/csrfToken", withCORS(csrfTokenHandler))

	// handle visitor submission
	mux.HandleFunc("/api/submissions/confirm", withCORS(ConfirmSubmission(serviceMiddleWare)))
	mux.HandleFunc("/api/submissions/delete", withCORS(SubmissionHandler(serviceMiddleWare)))
	mux.HandleFunc("/api/submissions/diff/", withCORS(GetSubmissionDiff(serviceMiddleWare)))

	mux.HandleFunc("/api/submissions/", withCORS(SubmissionHandler(serviceMiddleWare)))
	mux.HandleFunc("/api/submissions", withCORS(HandlerVisitorForm(serviceMiddleWare)))

	// [token] e74341c8-a7ab-40ed-b404-38e6406e3249
	// to remove
	mux.HandleFunc("/api/upload", withCORS(uploadHandler))

	// static file and image
	fsHandler := http.FileServer(http.Dir("./uploads"))
	fsStrippedHandler := http.StripPrefix("/images/", fsHandler)
	corsProtectedFs := withCORS(func(resp http.ResponseWriter, req *http.Request) {
		fsStrippedHandler.ServeHTTP(resp, req)
	})
	mux.Handle("/images/", http.HandlerFunc(corsProtectedFs))
	// handle /tmp/image
	mux.HandleFunc("/images/tmp/", tmpImgServer.ServeHandler)

	// handle protected routes
	protectedRoutes := http.NewServeMux()

	userHandler := getUserHandlerWithServices(serviceMiddleWare)
	userHandler = withCORS(userHandler)
	agendaHandler = withCORS(agendaHandler)

	protectedRoutes.HandleFunc("/scraper-task", taskHandler)
	// Agenda
	protectedRoutes.HandleFunc("/agenda", agendaHandler)

	protectedRoutes.HandleFunc("/user/", userHandler)
	protectedRoutes.HandleFunc("/user", userHandler)

	// user submission
	protectedRoutes.HandleFunc("/submissions", SubmissionHandler(serviceMiddleWare))

	protectedRoutes.HandleFunc("/agenda/admin", withCORS(AdminActionHandler(serviceMiddleWare)))
	// agenda/publication?action=publish
	// Post formsubmission

	// Clean
	stripped := http.StripPrefix("/api/protected", protectedRoutes)
	authHandler := authMiddleware(stripped)

	corsProtected := withCORS(func(resp http.ResponseWriter, req *http.Request) {
		authHandler.ServeHTTP(resp, req)
	})

	mux.Handle("/api/protected/", http.HandlerFunc(corsProtected))

	listenAddr := ":" + strconv.Itoa(portNumber)
	fmt.Println("Starting Api server of port %s", listenAddr)
	if err := http.ListenAndServe(listenAddr, mux); err != nil {
		fmt.Println("Error starting server:", err)
	}
}
