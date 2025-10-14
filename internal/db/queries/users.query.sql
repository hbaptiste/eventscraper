-- name: CreateUser :exec
INSERT INTO user (username, password, status, role)
VALUES (?, ?, ?, ?);