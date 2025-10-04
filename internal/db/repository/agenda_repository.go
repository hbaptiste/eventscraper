package repository

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/db"
	"errors"
	"fmt"
	"log"
	"math"
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

var ErrNoAgendaEntryFound = errors.New("No Agenda found")

var (
	dateLayout = "2006-01-02"
	timeLayout = "15:04"
)

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

	tagStrings := strings.Join(entity.Tags, ",")
	if entity.ID == "" {
		entity.ID = uuid.New().String()
	}
	_, err = stm.ExecContext(ctx,
		entity.ID,
		entity.Title,
		entity.Link,
		entity.Price,
		entity.Address,
		entity.StartDate.Format(dateLayout),
		entity.Description,
		entity.Poster,
		entity.Category,
		tagStrings,
		entity.Infos,
		entity.Place,
		entity.Status,
		entity.EventLifecycleStatus,
		entity.StartTime.Format(timeLayout),
		entity.EndTime.Format(timeLayout),
		entity.Subtitle,
		entity.EndDate.Format(dateLayout),
		entity.VenueName,
	)
	if err != nil {
		fmt.Errorf("Create agenda error %v", err)
	}
	// populate back with ID
	return entity, nil
}

func (repo *AgendaRepository) FindAll(ctx context.Context, filter Filter) ([]db.AgendaEntry, error) {
	var entries []db.AgendaEntry

	var criteria []string
	criteria = append(criteria, "WHERE 1=1")

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
			`
	// apply filter
	//WHERE enddate >= date('now', '-7 days')

	if filter != nil {
		if status, exists := filter["status"]; exists {
			if status == -int(db.Status_Unlinked) {
				// activeStatus := fmt.Sprintf("%d%d", db.Status_Active, db.Status_Archived)
				// statusCode, _ := strconv.Atoi(activeStatus)
				criteria = append(criteria, fmt.Sprintf("status!=%d", int(math.Abs(float64(status)))))
			} else if status == int(db.Status_Active) {
				criteria = append(criteria, fmt.Sprintf("status=%d OR status=%d", status, db.Status_Deleted))
			} else {
				criteria = append(criteria, fmt.Sprintf("status=%d", status))
			}
		}
		if owner, exists := filter["owner"]; exists {
			criteria = append(criteria, fmt.Sprintf("owner=%d", owner))
		}
	}
	query += strings.Join(criteria, " AND ")
	query += " ORDER BY startdate ASC;"
	fmt.Printf("Query:: %s \n", query)

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
			fmt.Printf("HS agenda_repository %v\n", err)
			return nil, err
		}
		if startDate, err := time.Parse(dateLayout, startDateString); err == nil {
			entry.StartDate = startDate
		} else {
			fmt.Printf("err%v", err)
		}

		if endDate, err := time.Parse(dateLayout, endDateString); err == nil {
			entry.EndDate = endDate
		}
		if startTime, err := time.Parse(timeLayout, startTimeString); err == nil {
			entry.StartTime = startTime
		} else {
			fmt.Printf("error %v, %s", startTime, startDateString)
		}
		if endTime, err := time.Parse(timeLayout, endTimeString); err == nil {
			entry.EndTime = endTime
		} else {
			fmt.Printf("error %v", endTime)
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

func (repo *AgendaRepository) rowToAgendaEntry(row *sql.Row, entry *db.AgendaEntry) (*db.AgendaEntry, error) {
	var tagString string
	var startDateString string
	var startTimeString string
	var endTimeString string
	var endDateString string

	err := row.Scan(
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
		fmt.Printf("agenda_repository:rowToAgendaEntry %v\n", err)
		return nil, err
	}
	if startDate, err := time.Parse(dateLayout, startDateString); err == nil {
		entry.StartDate = startDate
	}

	if endDate, err := time.Parse(dateLayout, endDateString); err == nil {
		entry.EndDate = endDate
	}
	if startTime, err := time.Parse(timeLayout, startDateString); err == nil {
		entry.StartTime = startTime
	}
	if endTime, err := time.Parse(timeLayout, startDateString); err == nil {
		entry.EndTime = endTime
	}

	if len(tagString) == 0 {
		entry.Tags = make([]string, 0)
	} else {
		entry.Tags = strings.Split(tagString, ",")
	}
	return entry, nil
}

func (repo *AgendaRepository) FindByID(ctx context.Context, id string) (db.AgendaEntry, error) {
	var agenda_entry db.AgendaEntry

	stm, err := repo.db.Prepare(`SELECT 
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
				WHERE
					id=?`)
	if err != nil {
		fmt.Printf("agenda_repository:FindByID %v\n", err)
		return agenda_entry, fmt.Errorf("Error while scanning agenda\n")
	}
	defer stm.Close()
	row := stm.QueryRowContext(ctx, id)
	_, err = repo.rowToAgendaEntry(row, &agenda_entry)
	return agenda_entry, err
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
		entry.StartDate.Format(dateLayout),

		entry.Description,
		entry.Poster,
		entry.Category,
		entry.FormatTagsToString(),

		entry.Infos,
		entry.Status,
		entry.EventLifecycleStatus,

		entry.Place,
		entry.StartTime.Format(timeLayout),
		entry.EndTime.Format(timeLayout),
		entry.Subtitle,
		entry.EndDate.Format(dateLayout),
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

func (repo *AgendaRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM agenda_entry WHERE id=?`
	result, err := repo.db.Exec(query, id)
	rowAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("failed to check rows affected: %w", err)
		return fmt.Errorf("failed to delete entry with id %s:", err)
	}
	if rowAffected == 0 {
		log.Printf("Agenda entry with id %s not found", err)
		return ErrNoAgendaEntryFound
	}
	return nil
}
