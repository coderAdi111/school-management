package com.school.management;

import com.school.management.entity.ClassRoom;
import com.school.management.entity.Student;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Seeds the real 2024 B.Tech Information Technology students used by the
 * 5th-semester IT timetable.
 *
 * IMPORTANT:
 * - Timetable records are NOT modified.
 * - Teacher records are NOT modified.
 * - Deleted students are NOT automatically reactivated.
 *
 * I1: 24IT01 through 24IT32
 * I2: 24IT33 through 24IT65
 */
@Component
public class StudentClassSeeder implements CommandLineRunner {

    @PersistenceContext
    private EntityManager em;

    private record StudentData(
            String collegeId,
            String name,
            String section
    ) {}

    private static final List<StudentData> STUDENTS = List.of(

            // =========================
            // I1
            // =========================

            new StudentData("24IT01", "Aaditya SIKHWAL", "I1"),
            new StudentData("24IT02", "Aditya Dubey", "I1"),
            new StudentData("24IT03", "Aditya GAUR", "I1"),
            new StudentData("24IT04", "Ajay Jangid", "I1"),
            new StudentData("24IT05", "Aman Singh Rawat", "I1"),
            new StudentData("24IT06", "Archit Kalya", "I1"),
            new StudentData("24IT07", "Ashok Kumar", "I1"),
            new StudentData("24IT08", "Ashok Kurdia", "I1"),
            new StudentData("24IT09", "Atharva Singh Chauhan", "I1"),
            new StudentData("24IT10", "Ayush Harisinghani", "I1"),
            new StudentData("24IT11", "Bhanuvardhan Singh Rathore", "I1"),
            new StudentData("24IT12", "BHUWAN SINGH MAHAWAR", "I1"),
            new StudentData("24IT13", "Devansh Jat", "I1"),
            new StudentData("24IT14", "Divyansh Rai", "I1"),
            new StudentData("24IT15", "Harshit Mangal", "I1"),
            new StudentData("24IT16", "Ishaan Karwa", "I1"),
            new StudentData("24IT17", "JATIN SADHWANI", "I1"),
            new StudentData("24IT18", "Jayesh Bhatnagar", "I1"),
            new StudentData("24IT19", "Kartik Sharma", "I1"),
            new StudentData("24IT20", "Kunal Sahu", "I1"),
            new StudentData("24IT21", "Lakhan Sharma", "I1"),
            new StudentData("24IT22", "Laksh Sharma", "I1"),
            new StudentData("24IT23", "Lalit Kumar Kachawa", "I1"),
            new StudentData("24IT24", "Lucky Singh", "I1"),
            new StudentData("24IT25", "MANISH KUMAR SHARMA", "I1"),
            new StudentData("24IT26", "Mayank Kumar", "I1"),
            new StudentData("24IT27", "Naman Joshi", "I1"),
            new StudentData("24IT28", "Nilaksh Soni", "I1"),
            new StudentData("24IT29", "NISHA Kudia", "I1"),
            new StudentData("24IT30", "Pawan Tunwal", "I1"),
            new StudentData("24IT31", "Payal Kanwar", "I1"),
            new StudentData("24IT32", "Pranjal Sunariya", "I1"),

            // =========================
            // I2
            // =========================

            new StudentData("24IT33", "Preetish Moyal", "I2"),
            new StudentData("24IT34", "Prince Sharma", "I2"),
            new StudentData("24IT35", "Priyanshu Chouhan", "I2"),
            new StudentData("24IT36", "Pushpendra Singh Rathore", "I2"),
            new StudentData("24IT37", "Radheshyam Dukiya", "I2"),
            new StudentData("24IT38", "Raghav Vyas", "I2"),
            new StudentData("24IT39", "Rajkumar Tailor", "I2"),
            new StudentData("24IT40", "Raman Kumar", "I2"),
            new StudentData("24IT41", "RASHI KUMARI Jeengar", "I2"),
            new StudentData("24IT42", "Rishabh Bajaj", "I2"),
            new StudentData("24IT43", "Rohan Dhawal", "I2"),
            new StudentData("24IT44", "ROHIT MALINDA", "I2"),
            new StudentData("24IT45", "Rohit Pareek", "I2"),
            new StudentData("24IT46", "Saaeem Akhtar", "I2"),
            new StudentData("24IT47", "SACHIN YADAV", "I2"),
            new StudentData("24IT48", "Sanvi Saraswat", "I2"),
            new StudentData("24IT49", "Shalu Meghwal", "I2"),
            new StudentData("24IT50", "Shashank Awwal", "I2"),
            new StudentData("24IT51", "SHasvat Sharma", "I2"),
            new StudentData("24IT52", "Shivien Rawat", "I2"),
            new StudentData("24IT53", "Shreyansh Jain", "I2"),
            new StudentData("24IT54", "Shubham Paliwal", "I2"),
            new StudentData("24IT55", "Siddharth Choyal", "I2"),
            new StudentData("24IT56", "UJJWAL CHOUDHARY", "I2"),
            new StudentData("24IT57", "Vedant Pareek", "I2"),
            new StudentData("24IT58", "Vedant Singh Shekhawat", "I2"),
            new StudentData("24IT59", "Vinay Kumar Shah", "I2"),
            new StudentData("24IT60", "Vishakha Jain", "I2"),
            new StudentData("24IT61", "Vishal Singh", "I2"),
            new StudentData("24IT62", "Yash Singh Rawat", "I2"),
            new StudentData("24IT63", "Yuvraj Singh Rawat", "I2"),
            new StudentData("24IT64", "Hitesh Bhati", "I2"),
            new StudentData("24IT65", "SHARMA GARGEE", "I2")
    );

    @Override
    @Transactional
    public void run(String... args) {

        // =========================================================
        // CURRENT CLASSES
        // =========================================================

        ClassRoom i1 = findOrCreateClass(
                "5th Semester IT - I1",
                "5th Semester",
                "I1",
                32
        );

        ClassRoom i2 = findOrCreateClass(
                "5th Semester IT - I2",
                "5th Semester",
                "I2",
                33
        );

        // =========================================================
        // HIDE OLD DEMO CLASSES
        // =========================================================

        /*
         * Old demo classes are NOT deleted because Attendance / Marks /
         * Fees may still reference them.
         */
        em.createQuery(
                "UPDATE ClassRoom c " +
                "SET c.name = :name, " +
                "c.grade = :grade, " +
                "c.section = :section " +
                "WHERE c.name IN (" +
                "'Class 10-A', " +
                "'Class 10-B', " +
                "'Class 12-A'" +
                ")"
        )
        .setParameter("name", "Legacy / Unused")
        .setParameter("grade", "Legacy")
        .setParameter("section", "OLD")
        .executeUpdate();

        // =========================================================
        // LOAD EXISTING STUDENTS
        // =========================================================

        List<Student> existing = em.createQuery(
                "SELECT s FROM Student s ORDER BY s.id",
                Student.class
        ).getResultList();

        Map<String, Student> byEmail = new HashMap<>();

        for (Student s : existing) {

            if (s.getEmail() != null) {

                byEmail.put(
                        s.getEmail()
                                .toLowerCase(Locale.ROOT),
                        s
                );
            }
        }

        Set<Long> actualStudentIds =
                new HashSet<>();

        // =========================================================
        // SYNC OFFICIAL STUDENTS
        // =========================================================

        for (StudentData data : STUDENTS) {

            String email =
                    data.collegeId()
                            .toLowerCase(Locale.ROOT)
                            + "@student.eca.local";

            Student student =
                    byEmail.get(email);

            /*
             * =====================================================
             * NEW STUDENT
             * =====================================================
             */

            if (student == null) {

                student = new Student();

                student.setEmail(email);

                String[] parts =
                        splitName(data.name());

                student.setFirstName(parts[0]);
                student.setLastName(parts[1]);

                student.setClassRoom(
                        "I1".equals(data.section())
                                ? i1
                                : i2
                );

                student.setStatus(
                        Student.Status.ACTIVE
                );

                em.persist(student);

                /*
                 * New student is part of the official list.
                 */
                em.flush();

                if (student.getId() != null) {

                    actualStudentIds.add(
                            student.getId()
                    );
                }

            }

            /*
             * =====================================================
             * EXISTING ACTIVE STUDENT
             * =====================================================
             */

            else if (
                    student.getStatus()
                            == Student.Status.ACTIVE
            ) {

                String[] parts =
                        splitName(data.name());

                student.setFirstName(parts[0]);
                student.setLastName(parts[1]);
                student.setEmail(email);

                student.setClassRoom(
                        "I1".equals(data.section())
                                ? i1
                                : i2
                );

                /*
                 * IMPORTANT:
                 * Status remains ACTIVE.
                 */
                student.setStatus(
                        Student.Status.ACTIVE
                );

                em.merge(student);

                actualStudentIds.add(
                        student.getId()
                );
            }

            /*
             * =====================================================
             * EXISTING INACTIVE STUDENT
             * =====================================================
             */

            else {

                /*
                 * This student was intentionally deleted
                 * by the admin.
                 *
                 * DO NOT:
                 * - reactivate
                 * - assign class
                 * - change status
                 * - create duplicate
                 *
                 * Simply leave it INACTIVE.
                 */

                continue;
            }
        }

        // =========================================================
        // OLD / DEMO STUDENTS
        // =========================================================

        /*
         * Students which are not part of the official current
         * list are kept safely in database but detached from
         * current classes and marked INACTIVE.
         *
         * This prevents old Attendance / Marks / Fees references
         * from breaking.
         */
        for (Student student : existing) {

            if (
                    student.getId() != null
                    && !actualStudentIds.contains(
                            student.getId()
                    )
            ) {

                student.setClassRoom(null);

                student.setStatus(
                        Student.Status.INACTIVE
                );

                em.merge(student);
            }
        }
    }

    // =============================================================
    // FIND OR CREATE CLASS
    // =============================================================

    private ClassRoom findOrCreateClass(
            String name,
            String grade,
            String section,
            int capacity
    ) {

        List<ClassRoom> rows =
                em.createQuery(
                        "SELECT c FROM ClassRoom c " +
                        "WHERE c.section = :section",
                        ClassRoom.class
                )
                .setParameter(
                        "section",
                        section
                )
                .setMaxResults(1)
                .getResultList();

        ClassRoom c;

        if (rows.isEmpty()) {

            c = new ClassRoom();

        } else {

            c = rows.get(0);
        }

        c.setName(name);
        c.setGrade(grade);
        c.setSection(section);
        c.setCapacity(capacity);

        if (c.getId() == null) {

            em.persist(c);

        } else {

            em.merge(c);
        }

        return c;
    }

    // =============================================================
    // SPLIT NAME
    // =============================================================

    private String[] splitName(
            String fullName
    ) {

        String clean =
                fullName
                        .trim()
                        .replaceAll(
                                "\\s+",
                                " "
                        );

        int space =
                clean.indexOf(' ');

        if (space < 0) {

            return new String[]{
                    clean,
                    "Student"
            };
        }

        return new String[]{
                clean.substring(
                        0,
                        space
                ),
                clean.substring(
                        space + 1
                )
        };
    }
}