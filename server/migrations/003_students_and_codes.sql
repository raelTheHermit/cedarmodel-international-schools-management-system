-- Staff login attempts store email addresses in this legacy-named column.
ALTER TABLE login_attempts ALTER COLUMN admission_number TYPE VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);

-- Teachers may only access their assigned classes. Superadmins remain unrestricted.
CREATE TABLE IF NOT EXISTS teacher_classes (
  staff_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, class_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class ON teacher_classes(class_id);
