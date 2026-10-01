-- 5th Semester Information Technology timetable faculty.
-- This is a reference/manual seed script. The application also contains
-- TimetableTeacherSeeder.java, which inserts missing faculty automatically.
-- Existing teachers are intentionally not deleted or modified.

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Shikha','Gupta',NULL,NULL,'MAD LAB / OS',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='shikha' AND LOWER(last_name)='gupta');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Deepak','Gupta',NULL,NULL,'COA',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='deepak' AND LOWER(last_name)='gupta');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Rakesh','Rathi',NULL,NULL,'CN / CN LAB',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='rakesh' AND LOWER(last_name)='rathi');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Bhanupriya','Sharma',NULL,NULL,'CCDT',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='bhanupriya' AND LOWER(last_name)='sharma');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Avinash','Bhandiya',NULL,NULL,'IDS / ML LAB',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='avinash' AND LOWER(last_name)='bhandiya');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Sammah','Rasheed',NULL,NULL,'IB',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='sammah' AND LOWER(last_name)='rasheed');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Monica','Sharma',NULL,NULL,'ML',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='monica' AND LOWER(last_name)='sharma');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Mangi','Lal',NULL,NULL,'Timetable Faculty',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='mangi' AND LOWER(last_name)='lal');

INSERT INTO teachers (first_name, last_name, email, phone, subject, qualification, status, created_at)
SELECT 'Satya Narayan','Tazi',NULL,NULL,'IT LAB',NULL,'ACTIVE',NOW()
WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE LOWER(first_name)='satya narayan' AND LOWER(last_name)='tazi');
