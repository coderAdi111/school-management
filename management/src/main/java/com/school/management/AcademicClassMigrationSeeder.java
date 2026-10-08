package com.school.management;

import com.school.management.entity.AcademicSection;
import com.school.management.entity.ClassRoom;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Keeps existing class/student records connected to the academic hierarchy.
 *
 * Older data may contain legacy values such as Engineering / IT / 5 / I1,
 * while the administrator may now have created the same academic path under
 * another department. We resolve the class against the real Academic Setup
 * records instead of hard-coding a department name.
 */
@Component
@Order(3)
public class AcademicClassMigrationSeeder implements CommandLineRunner {
    private final EntityManager em;

    public AcademicClassMigrationSeeder(EntityManager em) {
        this.em = em;
    }

    @Override
    @Transactional
    public void run(String... args) {
        List<ClassRoom> classes = em.createQuery("select c from ClassRoom c", ClassRoom.class).getResultList();
        List<AcademicSection> sections = em.createQuery(
                "select s from AcademicSection s " +
                "join fetch s.semester sem " +
                "join fetch sem.branch b " +
                "join fetch b.department d " +
                "where s.active = true and sem.active = true and b.active = true and d.active = true",
                AcademicSection.class).getResultList();

        boolean changed = false;
        for (ClassRoom classroom : classes) {
            if (classroom.getSection() == null || classroom.getSection().isBlank()) continue;
            if (classroom.getBranch() == null || classroom.getBranch().isBlank()) continue;
            if (classroom.getSemester() == null) continue;

            List<AcademicSection> matches = sections.stream()
                    .filter(s -> s.getName().equalsIgnoreCase(classroom.getSection()))
                    .filter(s -> s.getSemester().getSemesterNumber().equals(classroom.getSemester()))
                    .filter(s -> s.getSemester().getBranch().getCode().equalsIgnoreCase(classroom.getBranch())
                            || s.getSemester().getBranch().getName().equalsIgnoreCase(classroom.getBranch()))
                    .toList();

            if (matches.isEmpty()) continue;

            AcademicSection match = chooseMatch(matches, classroom.getDepartment());
            String department = match.getSemester().getBranch().getDepartment().getName();
            String branch = match.getSemester().getBranch().getCode();
            Integer semester = match.getSemester().getSemesterNumber();

            if (!equalsIgnoreCase(classroom.getDepartment(), department)) {
                classroom.setDepartment(department);
                changed = true;
            }
            if (!equalsIgnoreCase(classroom.getBranch(), branch)) {
                classroom.setBranch(branch);
                changed = true;
            }
            if (!semester.equals(classroom.getSemester())) {
                classroom.setSemester(semester);
                changed = true;
            }
        }

        if (changed) {
            em.flush();
        }
    }

    private AcademicSection chooseMatch(List<AcademicSection> matches, String currentDepartment) {
        // Preserve an already-correct department when more than one academic
        // hierarchy happens to use the same branch/semester/section names.
        if (currentDepartment != null && !currentDepartment.equalsIgnoreCase("Engineering")) {
            for (AcademicSection s : matches) {
                if (s.getSemester().getBranch().getDepartment().getName().equalsIgnoreCase(currentDepartment)) {
                    return s;
                }
            }
        }
        // Legacy "Engineering" was the old default. When a new academic
        // hierarchy exists for the same branch/semester/section, prefer it.
        // This is what migrates the original IT students to the department
        // currently configured in Academic Setup without deleting any data.
        if (currentDepartment == null || currentDepartment.equalsIgnoreCase("Engineering")) {
            for (AcademicSection s : matches) {
                String dept = s.getSemester().getBranch().getDepartment().getName();
                if (!dept.equalsIgnoreCase("Engineering")) return s;
            }
        }
        return matches.get(0);
    }

    private boolean equalsIgnoreCase(String a, String b) {
        return a == null ? b == null : a.equalsIgnoreCase(b);
    }
}
