-- name: ArchivePastEvents :exec
UPDATE agenda_entry SET status = 5 WHERE date(enddate, '+1 day') < date('now') OR enddate="";


-- name: GetAgendaCountFacets :one
SELECT
  SUM(CASE
    WHEN startdate <= CAST(sqlc.arg(today_end) AS TEXT)
    AND COALESCE(NULLIF(enddate, ''), startdate) >= CAST(sqlc.arg(today_start) AS TEXT)
    THEN 1 ELSE 0
  END) as today,
  
  SUM(CASE
    WHEN startdate <= CAST(sqlc.arg(weekend_end) AS TEXT)
    AND COALESCE(NULLIF(enddate, ''), startdate) >= CAST(sqlc.arg(weekend_start) AS TEXT)
    THEN 1 ELSE 0
  END) as this_weekend,
  
  SUM(CASE
    WHEN startdate <= CAST(sqlc.arg(week_end) AS TEXT)
    AND COALESCE(NULLIF(enddate, ''), startdate) >= CAST(sqlc.arg(week_start) AS TEXT)
    THEN 1 ELSE 0
  END) as this_week,
  
  SUM(CASE
    WHEN startdate <= CAST(sqlc.arg(next_week_end) AS TEXT)
    AND COALESCE(NULLIF(enddate, ''), startdate) >= CAST(sqlc.arg(next_week_start) AS TEXT)
    THEN 1 ELSE 0
  END) as next_week
FROM agenda_entry
WHERE status = 1;