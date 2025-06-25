
-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?);

-- name: GetRefreshToken :one
SELECT token from refresh_tokens where token=? and user_id=? and expires_at >= STRFTIME('%Y-%m-%d %H:%M:%S.999999', 'now');
