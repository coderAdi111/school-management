-- Run only if your Spring Boot JPA configuration does not create/update tables automatically.
CREATE TABLE IF NOT EXISTS timetable_entries (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  branch VARCHAR(20) NOT NULL DEFAULT 'IT',
  semester INT NOT NULL DEFAULT 5,
  section VARCHAR(10) NOT NULL,
  day_of_week VARCHAR(12) NOT NULL,
  subject VARCHAR(120) NOT NULL,
  faculty VARCHAR(120),
  room VARCHAR(80),
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  practical BOOLEAN NOT NULL DEFAULT FALSE
);
