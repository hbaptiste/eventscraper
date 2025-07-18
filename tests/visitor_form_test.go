package test

import (
	"dpatrov/scraper/internal/gendb"
	"testing"

	"github.com/stretchr/testify/mock"
)

type MockQueries struct {
	mock.Mock
}

func TestUserFormSubmission(t *testing.T) {
	mockQueries := new(MockQueries)
	expectedFormData := func(arg gendb.CreateFormSubmissionParams) bool {
		return arg.Email == "test@gmail.com" &&
			arg.Data == `{"name":"test"}` &&
			arg.Status == "pending" &&
			len(arg.ID) > 0 &&
			len(arg.EditToken) > 0 &&
			len(arg.CancelToken) > 0
	}
	// mock response
	mockDBReturn

	//send request
	// assert form created
	// assert mail is sent
	//
}
