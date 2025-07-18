DROP INDEX IF EXISTS idx_expired_at;
ALTER TABLE form_submissions DROP COLUMN expired_at;