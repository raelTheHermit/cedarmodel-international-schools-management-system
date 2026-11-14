-- Terms need a session ("2025/2026") and a next-term date; the same term name repeats every session.
ALTER TABLE terms ADD COLUMN IF NOT EXISTS session VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE terms ADD COLUMN IF NOT EXISTS next_term_begins DATE NULL;
ALTER TABLE terms DROP CONSTRAINT IF EXISTS terms_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_terms_session_name ON terms (session, name);
-- At most one current term, enforced by the database. (Fails if you currently have two is_current rows; fix those first.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_terms_one_current ON terms ((true)) WHERE is_current;

-- One result batch per class per term; one row per student per batch.
CREATE UNIQUE INDEX IF NOT EXISTS uq_result_batches_class_term ON result_batches (class_id, term_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_result_rows_batch_student ON result_rows (batch_id, student_id);
CREATE INDEX IF NOT EXISTS idx_result_rows_student ON result_rows (student_id);

-- Single-row school profile shown to parents (replaces the hardcoded contact details).
CREATE TABLE IF NOT EXISTS school_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name VARCHAR(150) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO school_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (id DESC);
