package repository

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/db"
	"fmt"
	"log"
)

type Repository[T any] interface {
	FindID(ctx context.Context, id string) (*T, error)
	FindAll(ctx context.Context) ([]*T, error)
	Create(ctx context.Context, entity *T) error
	Update(ctx context.Context, entity *T) error
	Delete(ctx context.Context, id string) error
}

type TaskRepository struct {
	db *sql.DB
}

// create
func NewTaskRepository(db *sql.DB) *TaskRepository {
	return &TaskRepository{db}
}

// Inplementation
func (repo *TaskRepository) Create(ctx context.Context, model *db.ScrapingTask) error {
	stm, err := repo.db.Prepare("INSERT INTO scraping_task (type, url, params, running_time) VALUES (?, ?, ?, ?)")
	if err != nil {
		log.Fatalf("Create STM error: %v", err)
	}
	result, qrerr := stm.ExecContext(ctx,
		model.Type,
		model.Url,
		model.ScrapingParams.ToJSON(),
		model.CreatedTime.Format("2006-01-02 15:04:05"))
	//
	if qrerr != nil {
		log.Fatalf("ExecContext STM error: %f", qrerr)
	}

	// Check if any rows were affected
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Error getting rows affected: %w", err)
	}
	fmt.Printf("Inserted %d row(s)\n", rowsAffected)
	return err
}
