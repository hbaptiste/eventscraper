package utils

import (
	"context"
	"database/sql"
	"dpatrov/scraper/internal/gendb"
	"time"
)

type EventFacetCounts struct {
	Today       int       `json:"today"`
	ThisWeekend int       `json:"thisWeekend"`
	ThisWeek    int       `json:"thisWeek"`
	NextWeek    int       `json:"nexWeek"`
	CacheAt     time.Time `json:"-"`
	queries     gendb.Queries
}

func NewEventFacetCounts(db *sql.DB) *EventFacetCounts {
	return &EventFacetCounts{
		queries: *gendb.New(db),
	}
}

func (efc EventFacetCounts) GetFacetCount(ctx context.Context, params gendb.GetAgendaCountFacetsParams) (*EventFacetCounts, error) {
	result, err := efc.queries.GetAgendaCountFacets(ctx, params)
	if err != nil {
		return nil, err
	}
	return &EventFacetCounts{
		Today:       int(result.Today.Float64),
		ThisWeekend: int(result.ThisWeekend.Float64),
		ThisWeek:    int(result.ThisWeek.Float64),
		NextWeek:    int(result.NextWeek.Float64),
	}, nil

}
