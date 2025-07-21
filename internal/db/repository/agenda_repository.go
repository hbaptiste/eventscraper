package repository

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/db"
	"fmt"
	"log"
	"reflect"
	"strings"
	"time"

	"github.com/google/uuid"
)

type AgendaRepository struct {
	db *sql.DB
}

func NewAgendaRepository(db *sql.DB) *AgendaRepository {
	return &AgendaRepository{db}
}

type Filter = map[string]int

// API
func (repo *AgendaRepository) Create(ctx context.Context, entity *db.AgendaEntry) (*db.AgendaEntry, error) {
	stm, err := repo.db.Prepare(`INSERT INTO agenda_entry
									(id, title, link, price, address, 
										startdate, description, poster, category, tag, 
										infos, place, status, event_lifecycle_status,
										starttime, endtime, subtitle, enddate, venuename)
										VALUES 
									(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		log.Fatalf("AgendaRepository::Create STM error: %v", err)
	}

	vals := reflect.ValueOf(*entity)
	fields := make([]any, 0, vals.NumField())

	tagStrings := strings.Join(entity.Tags, ",")

	fmt.Println(fields, tagStrings)
	entity.ID = uuid.New().String()
	_, err = stm.ExecContext(ctx,
		entity.ID,
		entity.Title,
		entity.Link,
		entity.Price,
		entity.Address,
		entity.StartDate,
		entity.Description,
		entity.Poster,
		entity.Category,
		tagStrings,
		entity.Infos,
		entity.Place,
		entity.Status,
		entity.EventLifecycleStatus,
		entity.StartTime,
		entity.EndTime,
		entity.Subtitle,
		entity.EndDate,
		entity.VenueName,
	)
	if err != nil {
		fmt.Errorf("Create agenda error %v", err)
	}
	fmt.Println("item %v", entity)
	// populate back with ID
	return entity, nil
}

func (repo *AgendaRepository) FindAll(ctx context.Context, filter Filter) ([]db.AgendaEntry, error) {
	var entries []db.AgendaEntry

	var criteria []string
	criteria = append(criteria, "AND 1=1")

	query := `SELECT 
				id, 
				title, 
				link, 
				price, 
				address, 
				startdate, 
				description, 
				poster, 
				category, 
				tag, 
				infos, 
				status,
				event_lifecycle_status,
				place,
				starttime,
				endtime,
				subtitle,
				enddate,
				venuename
			FROM agenda_entry
			WHERE enddate >= date('now', '-7 days')
			`
	// apply filter

	if filter != nil {
		if status, exists := filter["status"]; exists {
			criteria = append(criteria, fmt.Sprintf("status=%d", status))
		}
		if owner, exists := filter["owner"]; exists {
			criteria = append(criteria, fmt.Sprintf("owner=%d", owner))
		}
	}
	query += strings.Join(criteria, " AND ")
	query += " ORDER BY startdate ASC;"

	var tagString string
	var startDateString string
	var endDateString string
	var startTimeString string
	var endTimeString string

	rows, err := repo.db.Query(query)
	if err != nil {
		fmt.Errorf("%v", err)
		return nil, err
	}
	for rows.Next() {
		var entry db.AgendaEntry
		err := rows.Scan(
			&entry.ID,
			&entry.Title,
			&entry.Link,
			&entry.Price,
			&entry.Address,
			&startDateString,
			&entry.Description,
			&entry.Poster,
			&entry.Category,
			&tagString,
			&entry.Infos,
			&entry.Status,
			&entry.EventLifecycleStatus,
			&entry.Place,
			&startTimeString,
			&endTimeString,
			&entry.Subtitle,
			&endDateString,
			&entry.VenueName,
		)
		if err != nil {
			fmt.Printf("agenda_repository %v\n", err)
			return nil, fmt.Errorf("Error while scanning agenda\n")
		}
		if startDate, err := time.Parse(time.RFC3339, startDateString); err == nil {
			fmt.Printf("%v\n", err)
			entry.StartDate = startDate
		}

		if endDate, err := time.Parse(time.RFC3339, endDateString); err == nil {
			entry.EndDate = endDate
		}
		if startTime, err := time.Parse(time.RFC3339, startDateString); err == nil {
			fmt.Printf("%v\n", err)
			entry.StartTime = startTime
		}
		if endTime, err := time.Parse(time.RFC3339, startDateString); err == nil {
			fmt.Printf("%v\n", err)
			entry.EndTime = endTime
		}

		if len(tagString) == 0 {
			entry.Tags = make([]string, 0)
		} else {
			entry.Tags = strings.Split(tagString, ",")
		}
		entries = append(entries, entry)
	}
	return entries, nil

}

func (repo *AgendaRepository) Update(ctx context.Context, entry db.AgendaEntry) error {
	query := `
		UPDATE agenda_entry
		SET 
			title = ?, 
			link = ?, 
			price = ?, 
			address = ?, 
			startdate = ?,  
			description = ?, 
			poster = ?, 
			category = ?, 
			tag = ?,
			infos = ?, 
			status = ?, 
			event_lifecycle_status = ?, 
			place = ?,
			starttime = ?,
			endtime = ?,
			subtitle = ?,
			enddate = ?,
			venuename = ?
		WHERE id = ?` // Change tag -> tags after migration

	stm, err := repo.db.Prepare(query)
	if err != nil {
		log.Printf("Error while updating entry: [%v]", err)
		return fmt.Errorf("prepare update statement: %w", err)
	}
	defer stm.Close()
	_, err = stm.ExecContext(ctx,
		entry.Title,
		entry.Link,
		entry.Price,
		entry.Address,
		entry.StartDate,
		entry.Description,
		entry.Poster,
		entry.Category,
		entry.FormatTagsToString(),
		entry.Infos,
		entry.Status,
		entry.EventLifecycleStatus,
		entry.Place,
		entry.StartTime,
		entry.EndTime,
		entry.Subtitle,
		entry.EndDate,
		entry.VenueName,
		entry.ID)
	if err != nil {
		log.Printf("[%v]", err)
		return fmt.Errorf("execute update statement:%w", err)
	}
	return nil
}

func (repo *AgendaRepository) UpdateStatus(id string, status int) error {
	query := `UPDATE agenda_entry SET status=? WHERE id=?`
	result, err := repo.db.Exec(query, status, id)
	if err != nil {
		log.Printf("Failed to update status %w", err)
		return fmt.Errorf("Failed to update status %w", err)

	}
	rowAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("failed to check rows affected: %w", err)
		return fmt.Errorf("failed to update status: %w", err)
	}
	if rowAffected == 0 {
		log.Printf("Agenda entry with id %s not found", err)
		return fmt.Errorf("Agenda entry with id %s not found", err)
	}
	return nil
}

func Delete() {}
