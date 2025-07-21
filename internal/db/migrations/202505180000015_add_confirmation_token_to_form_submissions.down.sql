DROP INDEX IF EXISTS idx_confirmation_token;
ALTER TABLE form_submissions DROP COLUMN confirmation_token;