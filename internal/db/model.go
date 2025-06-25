package db

import (
	"encoding/json"
	"fmt"
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

type AgendaEntry struct {
	ID                   string   `json:"id"`
	Title                string   `json:"title"`
	Link                 string   `json:"link"`
	Price                int      `json:"price"`
	VenueName            string   `json:"venuename"`
	Address              string   `json:"address"`
	StartDate            string   `json:"startdate"`
	Description          string   `json:"description"`
	Poster               string   `json:"poster"`
	Category             string   `json:"category"`
	Tags                 []string `json:"tags"`
	Infos                string   `json:"infos"`
	Status               Status   `json:"status"`
	Place                string   `json:"place"`
	EventLifecycleStatus string   `json:"eventLifecycleStatus"`
	StartTime            string   `json:"starttime"`
	EndTime              string   `json:"endtime"`
	Subtitle             string   `json:"subtitle"`
	EndDate              string   `json:"enddate"`
}

func (entry AgendaEntry) FormatTagsToString() string {
	return strings.Join(entry.Tags, ",")
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
