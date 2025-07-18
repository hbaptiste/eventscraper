CREATE TABLE IF NOT EXISTS form_submissions (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        data TEXT NOT NULL,
        edit_token TEXT UNIQUE NOT NULL,
        cancel_token TEXT UNIQUE NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
    );
CREATE INDEX IF NOT EXISTS idx_edit_token ON form_submissions(edit_token);
CREATE INDEX IF NOT EXISTS idx_cancel_token ON form_submissions(cancel_token);
CREATE INDEX IF NOT EXISTS idx_created_at ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_status ON form_submissions(status);