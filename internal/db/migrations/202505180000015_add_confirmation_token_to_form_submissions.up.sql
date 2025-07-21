ALTER TABLE form_submissions ADD COLUMN confirmation_token VARCHAR(255) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_confirmation_token ON form_submissions(confirmation_token);