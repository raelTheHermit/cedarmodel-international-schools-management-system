CREATE TABLE IF NOT EXISTS student_subject_profiles (
  student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  stream VARCHAR(20) NOT NULL DEFAULT 'custom'
    CHECK (stream IN ('science', 'arts', 'commercial', 'custom')),
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);