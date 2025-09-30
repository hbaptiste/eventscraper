-- name: ArchivePastEvents :exec
UPDATE agenda_entry SET status = 5 WHERE date(enddate, '+1 day') < date('now') OR enddate="";
