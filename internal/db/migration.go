package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type Logger struct {
	verbose bool
}

func (l Logger) Printf(format string, v ...interface{}) {
	log.Printf("[MIGRATE] "+format, v...)
}

func (l Logger) Verbose() bool {
	return l.verbose == true
}

func SetupMigration(db *sql.DB, migrationDir string) (*migrate.Migrate, error) {
	// create the folder if if
	fmt.Println("Inside SetupMigration....")
	if err := os.MkdirAll(migrationDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create migrations directory: %w", err)
	}
	if absPath, err := filepath.Abs(migrationDir); err != nil {
		fmt.Printf("Migration path %s not found!", absPath)
		return nil, fmt.Errorf("failed to create or to found migration directory: %w", err)
	} else {
		log.Println("Migration path found:", absPath)
	}

	// sqlite driver from migration
	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		return nil, fmt.Errorf("Failed to create migration driver: %w", err)
	}
	log.Printf("Migration driver created %v\n", driver)

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationDir), "sqlite3", driver)
	if err != nil {
		return nil, fmt.Errorf("Failed to create migration instance: %w", err)
	}
	m.Log = &Logger{verbose: true}

	log.Printf("Migration created %v\n", m)
	return m, nil
}

func RunMigration(db *sql.DB, migrationsDir string) error {
	m, err := SetupMigration(db, migrationsDir)
	if err != nil {
		log.Fatalf("Failed to Setup migration...", err)
		return fmt.Errorf("Failed to Setup migration %v", err)
	}
	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return err
	}
	if dirty {
		log.Printf("Database is dirty at version %d, forcing clean state...", version)
		err = m.Force(int(version))
		if err != nil {
			return fmt.Errorf("Failed to force version: %w", err)
		}
	}

	log.Println("Starting migrations...!")
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate column") {
			log.Println("Migration already applied (duplicate column), continuing...")
			return nil
		}
		log.Fatalf("Failed to Setup migration...", err)
	}
	log.Println("Migrations completed successfully")
	return nil
}
