ALTER TABLE form_submissions ADD COLUMN expired_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
CREATE INDEX IF NOT EXISTS idx_expired_at ON form_submissions(expired_at);