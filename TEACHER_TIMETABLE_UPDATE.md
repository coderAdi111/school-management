# Timetable Teacher Update

This update adds the 5th-semester Information Technology timetable faculty to the existing Teacher data.

## What changed
- Added `TimetableTeacherSeeder.java` to insert missing timetable faculty automatically when the Spring Boot backend starts.
- Existing teachers are NOT deleted or modified, so current class/teacher relationships remain safe.
- Added `management/db/timetable_teachers.sql` as a manual/reference seed script.

## Added faculty
- Dr. Shikha Gupta — MAD LAB / OS
- Dr. Deepak Gupta — COA
- Dr. Rakesh Rathi — CN / CN LAB
- Mrs. Bhanupriya Sharma — CCDT
- Mr. Avinash Bhandiya — IDS / ML LAB
- Ms. Sammah Rasheed — IB
- Mrs. Monica Sharma — ML
- Mr. Mangi Lal — Timetable Faculty (subject not uniquely identified from the supplied timetable)
- Dr. Satya Narayan Tazi — IT LAB

## Important
The supplied timetable also contains an `PM` faculty initial for one ML LAB entry, but the provided faculty legend does not identify the full name for `PM`. It is intentionally not guessed or added.

After deploying the backend, open Teachers. The existing 4 teachers will remain, and these timetable faculty records will be added automatically once.
