package utils

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/gendb"
	"fmt"
	"log"
	"time"
)

func timeUntilMidnight() time.Duration {
	now := time.Now()
	nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	return nextMidnight.Sub(now)
}

type EventArchiver struct {
	queries  gendb.Queries
	interval time.Duration
	stopChan chan struct{}
}

func NewEventArchiver(db *sql.DB, interval time.Duration) *EventArchiver {
	return &EventArchiver{
		queries:  *gendb.New(db),
		interval: interval,
		stopChan: make(chan struct{}),
	}
}
func (ea *EventArchiver) Start(ctx context.Context) {
	go ea.run(ctx)
}

func (ea *EventArchiver) Stop() {
	close(ea.stopChan)
}

func (ea *EventArchiver) run(ctx context.Context) {

	initialDelay := timeUntilMidnight()
	log.Printf("Agenda archiver will start at next midnight (in %v)", initialDelay)
	firstTimer := time.NewTicker(initialDelay)
	defer firstTimer.Stop()

	// run on start
	ea.archivePastEvents(ctx)
	// Will wait until midnight
	select {
	case <-ctx.Done():
		log.Println("First midnight: Agenda Archiver stopped due to context cancellation...")
		return
	case <-firstTimer.C:
		ea.archivePastEvents(ctx)
	}
	// reset timer from now on
	ticker := time.NewTicker(ea.interval)
	defer ticker.Stop()
	// run on Start
	for {
		select {
		case <-ctx.Done():
			log.Println("Agenda Archiver stopped due to context cancellation")
			return
		case <-ticker.C:
			ea.archivePastEvents(ctx)
		}
	}
}
func (ea *EventArchiver) archivePastEvents(ctx context.Context) {
	now := time.Now()
	log.Printf("Starting archive process at %s", now)
	err := ea.queries.ArchivePastEvents(ctx)
	if err != nil {
		fmt.Printf("error %v", err)
	}
	log.Printf("Ending archive process at %s", time.Now())
}
