# IT 5th Semester Timetable Feature

This update adds timetable management for the Information Technology 5th semester with two separate sections: **I1** and **I2**. These are full sections, not lab subgroups.

## Included
- New Angular `/timetable` page linked in the navbar.
- I1/I2 section switch.
- Add, edit, delete and view timetable entries by day, time, faculty, room and practical/theory type.
- Spring Boot REST endpoints under `/api/timetable`.
- MySQL entity/table `timetable_entries`.
- Existing student, class, attendance, fees and marks modules were not intentionally changed.

## Backend deployment
1. Deploy the updated `management` backend to Render (or your existing backend host).
2. Confirm the backend's Spring/JPA configuration is set to create/update schema, or run `management/db/timetable_entries.sql` against the connected MySQL database.
3. The frontend service currently calls `https://school-management-vy1j.onrender.com/api/timetable`. If your backend URL differs, update `school-frontend/src/app/services/timetable.service.ts`.
4. Redeploy the Angular frontend after the backend is live.

## Use
Open **Timetable** from the navbar, select **I1** or **I2**, and enter that section's timetable. Entries are stored on the backend, so they remain available after refresh and across devices.

The uploaded college PDF was supplied as the source timetable. This interface intentionally allows the administrator to enter and verify each slot rather than silently guessing at merged cells or ambiguous lab periods in the scanned timetable.
