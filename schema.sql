CREATE DATABASE IF NOT EXISTS college_event;
USE college_event;

CREATE TABLE IF NOT EXISTS events (
  event_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(150) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  event_date DATE NOT NULL,
  venue VARCHAR(150) NOT NULL,
  description TEXT
);

-- Optional sample data. Remove these INSERTs if your table already has these records.
INSERT INTO events (event_id, event_name, event_type, event_date, venue, description) VALUES
(101, 'Annual Tech Fest', 'Technical', '2026-11-15', 'College Auditorium', 'Coding contests, project displays and technical talks'),
(102, 'Cultural Day', 'Cultural', '2026-11-22', 'Open-Air Stage', 'Music, dance, drama and student performances'),
(103, 'Web Development Workshop', 'Workshop', '2026-12-03', 'Computer Lab 2', 'Hands-on website development workshop'),
(104, 'Inter-College Sports Meet', 'Sports', '2026-12-12', 'College Sports Ground', 'Sports competitions between colleges'),
(105, 'Career Guidance Seminar', 'Seminar', '2027-01-08', 'Seminar Hall', 'Career guidance and interview preparation')
ON DUPLICATE KEY UPDATE event_name = VALUES(event_name);
