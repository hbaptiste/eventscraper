package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func InitDb() *sql.DB {
	db, err := sql.Open("sqlite", "agenda.db")
	if err != nil {
		panic(fmt.Errorf("failed to open database: %w", err))
	}
	log.Printf("Applying Migrations...")
	return db
}

func ApplyMigration(db *sql.DB) {
	if err := RunMigration(db, "./internal/db/migrations"); err != nil {
		log.Fatalf("failed to apply migration: %w", err)
	}
}
