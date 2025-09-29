package db

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"
)

type Record map[string]string

func (rec *Record) ToJSON() string {
	jsonData, err := json.Marshal(rec)
	if err != nil {
		fmt.Errorf("Error Marshalling json %w", err)
		return ""
	}
	return string(jsonData)
}

type Status int

const (
	Status_Inactive Status = iota
	Status_Active
	Status_Pending
	Status_Deleted
	Status_Unlinked
	Status_Archived
)

// custom unmarshal

func (a *Status) UnmarshalJSON(b []byte) error {

	var value int
	if err := json.Unmarshal(b, &value); err != nil {
		return err
	}
	switch value {
	case 0:
		*a = Status_Inactive
	case 1:
		*a = Status_Active
	case 2:
		*a = Status_Pending
	case 3:
		*a = Status_Deleted
	case 4:
		*a = Status_Unlinked
	case 5:
		*a = Status_Archived
	default:
		*a = Status_Inactive
	}
	return nil
}

type ScrapingTask struct {
	Id             int
	Int            int
	Type           string
	Url            string
	ScrapingParams Record
	CreatedTime    time.Time
}

var (
	dateLayout = "2006-01-02"
	timeLayout = "15:04"
)

type ErrorMap = map[string]string

type AgendaEntry struct {
	ID                   string    `json:"id"`
	Title                string    `json:"title"`
	Link                 string    `json:"link"`
	Price                string    `json:"price"`
	VenueName            string    `json:"venuename"`
	Address              string    `json:"address"`
	StartDate            time.Time `json:"startdate"`
	Description          string    `json:"description"`
	Poster               string    `json:"poster"`
	Category             string    `json:"category"`
	Tags                 []string  `json:"tags"`
	Infos                string    `json:"infos"`
	Status               Status    `json:"status"`
	Place                string    `json:"place"`
	EventLifecycleStatus string    `json:"eventLifecycleStatus"`
	StartTime            time.Time `json:"starttime"`
	EndTime              time.Time `json:"endtime"`
	Subtitle             string    `json:"subtitle"`
	EndDate              time.Time `json:"enddate"`
}

func (entry AgendaEntry) FormatTagsToString() string {
	return strings.Join(entry.Tags, ",")
}
func (entry AgendaEntry) ToJSON() (string, error) {
	jsonData, err := json.Marshal(entry)
	if err != nil {
		return "", err
	}
	return string(jsonData), nil
}
func (entry AgendaEntry) MarshalJSON() ([]byte, error) {
	type Alias AgendaEntry
	return json.Marshal(&struct {
		StartDate string `json:"startdate"`
		EndDate   string `json:"enddate"`
		StartTime string `json:"starttime"`
		EndTime   string `json:"endtime"`
		*Alias
	}{
		StartDate: entry.StartDate.Format(dateLayout),
		EndDate:   entry.EndDate.Format(dateLayout),
		StartTime: entry.StartTime.Format(timeLayout),
		EndTime:   entry.EndTime.Format(timeLayout),
		Alias:     (*Alias)(&entry),
	})
}

func (entry *AgendaEntry) UnmarshalJSON(data []byte) error {
	type Alias AgendaEntry
	aux := &struct {
		StartDate string `json:"startdate"`
		EndDate   string `json:"enddate"`
		StartTime string `json:"starttime"`
		EndTime   string `json:"endtime"`
		*Alias
	}{
		Alias: (*Alias)(entry),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if aux.StartDate != "" {
		startDate, err := time.Parse(dateLayout, aux.StartDate)
		if err != nil {
			return fmt.Errorf("failed to parse startdate: %w", err)
		}
		entry.StartDate = startDate
	}

	if aux.EndDate != "" {
		endDate, err := time.Parse(dateLayout, aux.EndDate)
		if err != nil {
			return fmt.Errorf("failed to parse enddate: %w", err)
		}
		entry.EndDate = endDate
	}

	// Parse times using time-only format
	if aux.StartTime != "" {
		startTime, err := time.Parse(timeLayout, aux.StartTime)
		if err != nil {
			return fmt.Errorf("failed to parse starttime: %w", err)
		}
		entry.StartTime = startTime
	}

	if aux.EndTime != "" {
		endTime, err := time.Parse(timeLayout, aux.EndTime)
		if err != nil {
			return fmt.Errorf("failed to parse endtime: %w", err)
		}
		entry.EndTime = endTime
	}

	return nil

}
func (entry *AgendaEntry) IsZero() bool {
	return reflect.ValueOf(entry).IsZero()
}

func (entry *AgendaEntry) Validate() error {
	var errorsList []string
	if !entry.EndDate.IsZero() {
		if entry.EndDate.Before(entry.StartDate) {
			errorsList = append(errorsList, "end date must be after or equal to start date")
		}
	}

	// Validate EndTime (considering EndDate)
	if !entry.EndTime.IsZero() {
		if entry.EndDate.IsZero() || entry.EndDate.Equal(entry.StartDate) {
			// Same day event
			if entry.EndTime.Before(entry.StartTime) {
				errorsList = append(errorsList, "end time must be after or equal to start time")
			}
		} else {
			// Multi-day event
			fullStart := time.Date(
				entry.StartDate.Year(), entry.StartDate.Month(), entry.StartDate.Day(),
				entry.StartTime.Hour(), entry.StartTime.Minute(), entry.StartTime.Second(),
				0, entry.StartDate.Location(),
			)

			fullEnd := time.Date(
				entry.EndDate.Year(), entry.EndDate.Month(), entry.EndDate.Day(),
				entry.EndTime.Hour(), entry.EndTime.Minute(), entry.EndTime.Second(),
				0, entry.EndDate.Location(),
			)

			if fullEnd.Before(fullStart) {
				errorsList = append(errorsList, "end date and time must be after start date and time")
			}
		}
	}

	if len(errorsList) > 0 {
		return fmt.Errorf(strings.Join(errorsList, "; "))
	}

	return nil
}

func UnmarshalAgendaEntry(data []byte) (*AgendaEntry, error) {
	// rawjson
	var rawData map[string]interface{}

	if err := json.Unmarshal(data, &rawData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal to map: %v", err)
	}
	formDataValue, exists := rawData["formData"]
	if !exists {
		return nil, fmt.Errorf("missing key in payload")
	}

	formData, ok := formDataValue.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("Can't extract agendaEntry...")
	}

	timesField := []string{"starttime", "endtime", "startdate", "enddate"}

	for _, field := range timesField {
		if value, exists := formData[field]; exists {
			// convert value interface -> string
			var layout = dateLayout
			if dateString, ok := value.(string); ok && dateString != "" {
				if strings.Contains(field, "time") {
					layout = timeLayout // time
				}
				input, err := time.Parse(layout, dateString)
				if err != nil {
					return nil, err
				}
				formData[field] = input.Format(time.RFC3339)
			}
		}
	}
	// save edit
	rawData["formData"] = formData
	// back to json
	agendaJSON, err := json.Marshal(rawData["formData"])
	if err != nil {
		return nil, fmt.Errorf("Failed to marshal agenda entry %v", err)
	}
	// json -> agendaEntry
	var entry AgendaEntry
	if err := json.Unmarshal(agendaJSON, &entry); err != nil {
		return nil, fmt.Errorf("Failed to unmarshal to agenda %v", err)
	}
	return &entry, nil

}

type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	Password     string `json:"-"`
	Role         string `json:"role"`
	Status       int    `json:"status"`
	TokenVersion int
}

func (user User) IsAdmin() bool {
	roles := strings.Split(user.Role, ",")
	for _, role := range roles {
		if role == "adm" || role == "admin" {
			return true
		}
	}
	return false
}

func NewScrapingTask() *ScrapingTask {
	return &ScrapingTask{
		CreatedTime: time.Now(),
	}
}

func NewAgendaEntry() *AgendaEntry {
	return &AgendaEntry{}
}
