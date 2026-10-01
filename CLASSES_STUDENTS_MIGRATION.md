# Classes + Students migration

- Timetable: unchanged.
- Teachers: unchanged.
- Classes: 5th Semester IT - I1 (capacity 32) and I2 (capacity 33).
- Students: 24IT01–24IT32 -> I1; 24IT33–24IT65 -> I2.
- Old demo classes are retained as `Legacy / Unused` to avoid breaking foreign-key references.
- Old demo students are retained as INACTIVE with no class; they do not appear in the Students page.

## Important
Restart the Spring Boot backend after replacing the backend files. `StudentClassSeeder` runs at backend startup and migrates the existing database automatically.

Do not delete timetable or teacher tables.
