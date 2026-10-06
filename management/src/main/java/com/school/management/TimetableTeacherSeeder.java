package com.school.management;

import com.school.management.entity.Teacher;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Adds the faculty listed on the 5th-semester IT timetable without deleting
 * or changing the existing teacher records. Existing records are kept so
 * current class/teacher relationships are not broken.
 */
@Component
public class TimetableTeacherSeeder implements CommandLineRunner {

    @PersistenceContext
    private EntityManager em;

    private record Faculty(String firstName, String lastName, String subject, String facultyCode) {}

    private static final List<Faculty> TIMETABLE_FACULTY = List.of(
            new Faculty("Shikha", "Gupta", "MAD LAB / OS", "SG"),
            new Faculty("Deepak", "Gupta", "COA", "DG"),
            new Faculty("Rakesh", "Rathi", "CN / CN LAB", "RR"),
            new Faculty("Bhanupriya", "Sharma", "CCDT", "BPS"),
            new Faculty("Avinash", "Bhandiya", "IDS / ML LAB", "AB"),
            new Faculty("Sammah", "Rasheed", "IB", "SR"),
            new Faculty("Monica", "Sharma", "ML", "ML"),
            new Faculty("Satya Narayan", "Tazi", "IT LAB", "SNT")
    );

    @Override
    @Transactional
    public void run(String... args) {
        for (Faculty faculty : TIMETABLE_FACULTY) {
            List<Teacher> byCode = em.createQuery(
                    "SELECT t FROM Teacher t WHERE UPPER(TRIM(t.facultyCode)) = :code",
                    Teacher.class
            )
            .setParameter("code", faculty.facultyCode().toUpperCase())
            .setMaxResults(1)
            .getResultList();

            Teacher teacher;
            if (!byCode.isEmpty()) {
                teacher = byCode.get(0);
            } else {
                List<Teacher> byName = em.createQuery(
                        "SELECT t FROM Teacher t " +
                        "WHERE LOWER(t.firstName) = LOWER(:firstName) " +
                        "AND LOWER(t.lastName) = LOWER(:lastName)",
                        Teacher.class
                )
                .setParameter("firstName", faculty.firstName())
                .setParameter("lastName", faculty.lastName())
                .setMaxResults(1)
                .getResultList();

                if (byName.isEmpty()) {
                    teacher = new Teacher();
                    teacher.setFirstName(faculty.firstName());
                    teacher.setLastName(faculty.lastName());
                    teacher.setQualification(null);
                    teacher.setStatus(Teacher.Status.ACTIVE);
                    em.persist(teacher);
                } else {
                    teacher = byName.get(0);
                }
            }

            // Fill/repair only the timetable code and subject; do not overwrite
            // user-managed email, phone, qualification or name changes.
            if (!faculty.facultyCode().equalsIgnoreCase(teacher.getFacultyCode() == null ? "" : teacher.getFacultyCode().trim())) {
                teacher.setFacultyCode(faculty.facultyCode());
            }
            if (teacher.getSubject() == null || teacher.getSubject().isBlank()) {
                teacher.setSubject(faculty.subject());
            }
            if (teacher.getStatus() == null) {
                teacher.setStatus(Teacher.Status.ACTIVE);
            }
        }
    }
}
