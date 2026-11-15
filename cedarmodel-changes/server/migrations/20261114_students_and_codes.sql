-- login_attempts.admission_number also stores staff emails (see auth.ts), which can exceed 50 chars.
ALTER TABLE login_attempts ALTER COLUMN admission_number TYPE VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);

-- Which classes a teacher may see. Superadmins are not listed here; they see everything.
CREATE TABLE IF NOT EXISTS teacher_classes (
  staff_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_class ON teacher_classes(class_id);
