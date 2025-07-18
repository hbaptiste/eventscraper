-- name: CreateFormSubmission :exec
INSERT INTO form_submissions (id, email, data, edit_token, cancel_token, created_at, updated_at, expired_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: GetSubmissionByToken :one
SELECT id, email, data, edit_token, cancel_token, created_at, updated_at, expired_at, status
    FROM form_submissions 
    WHERE (edit_token = ? OR cancel_token = ?);

-- name: GetSubmissions :many
SELECT * 
    FROM form_submissions
    WHERE status='pending' or status='active';



-- name: UpdateSubmissionStatus :exec
UPDATE form_submissions 
    SET status = ?, data = ?
    WHERE edit_token = ?;

-- name: CancelSubmission :exec
UPDATE form_submissions 
    SET status = 'cancelled', updated_at = ? 
    WHERE cancel_token = ? AND status = 'active' or status='pending';

-- name: CleanupOldSubmission :exec
DELETE FROM form_submissions 
    WHERE created_at < datetime('now', '-30 days')