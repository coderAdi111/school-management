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

    private record Faculty(String firstName, String lastName, String subject) {}

    private static final List<Faculty> TIMETABLE_FACULTY = List.of(
            new Faculty("Shikha", "Gupta", "MAD LAB / OS"),
            new Faculty("Deepak", "Gupta", "COA"),
            new Faculty("Rakesh", "Rathi", "CN / CN LAB"),
            new Faculty("Bhanupriya", "Sharma", "CCDT"),
            new Faculty("Avinash", "Bhandiya", "IDS / ML LAB"),
            new Faculty("Sammah", "Rasheed", "IB"),
            new Faculty("Monica", "Sharma", "ML"),
            new Faculty("Mangi", "Lal", "Timetable Faculty"),
            new Faculty("Satya Narayan", "Tazi", "IT LAB")
    );

    @Override
    @Transactional
    public void run(String... args) {
        for (Faculty faculty : TIMETABLE_FACULTY) {
            boolean exists = !em.createQuery(
                    "SELECT t.id FROM Teacher t " +
                    "WHERE LOWER(t.firstName) = LOWER(:firstName) " +
                    "AND LOWER(t.lastName) = LOWER(:lastName)",
                    Long.class
            )
            .setParameter("firstName", faculty.firstName())
            .setParameter("lastName", faculty.lastName())
            .setMaxResults(1)
            .getResultList()
            .isEmpty();

            if (exists) {
                continue;
            }

            Teacher teacher = new Teacher();
            teacher.setFirstName(faculty.firstName());
            teacher.setLastName(faculty.lastName());
            teacher.setSubject(faculty.subject());
            teacher.setQualification(null);
            teacher.setStatus(Teacher.Status.ACTIVE);

            em.persist(teacher);
        }
    }
}
