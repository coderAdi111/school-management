package com.school.management;

import com.school.management.entity.*;
import com.school.management.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the existing ECA academic hierarchy only when it is missing.
 * Administrators can then add any department/branch/semester/section without
 * changing application code.
 */
@Component
@Order(1)
public class AcademicStructureSeeder implements CommandLineRunner {
    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final AcademicSemesterRepository semesters;
    private final AcademicSectionRepository sections;

    public AcademicStructureSeeder(DepartmentRepository departments,
                                   BranchRepository branches,
                                   AcademicSemesterRepository semesters,
                                   AcademicSectionRepository sections) {
        this.departments = departments;
        this.branches = branches;
        this.semesters = semesters;
        this.sections = sections;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Department department = departments.findAll().stream()
                .filter(d -> "Engineering".equalsIgnoreCase(d.getName()) || "ENG".equalsIgnoreCase(d.getCode()))
                .findFirst().orElseGet(() -> {
                    Department d = new Department();
                    d.setName("Engineering"); d.setCode("ENG"); d.setActive(true);
                    return departments.save(d);
                });

        Branch branch = branches.findByDepartmentIdAndActiveTrueOrderByNameAsc(department.getId()).stream()
                .filter(b -> "Information Technology".equalsIgnoreCase(b.getName()) || "IT".equalsIgnoreCase(b.getCode()))
                .findFirst().orElseGet(() -> {
                    Branch b = new Branch();
                    b.setName("Information Technology"); b.setCode("IT"); b.setDepartment(department); b.setActive(true);
                    return branches.save(b);
                });

        AcademicSemester semester = semesters.findByBranchIdAndActiveTrueOrderBySemesterNumberAsc(branch.getId()).stream()
                .filter(s -> Integer.valueOf(5).equals(s.getSemesterNumber()))
                .findFirst().orElseGet(() -> {
                    AcademicSemester s = new AcademicSemester();
                    s.setSemesterNumber(5); s.setName("5th Semester"); s.setBranch(branch); s.setActive(true);
                    return semesters.save(s);
                });

        ensureSection(semester, "I1");
        ensureSection(semester, "I2");
    }

    private void ensureSection(AcademicSemester semester, String name) {
        boolean exists = sections.findBySemesterIdAndActiveTrueOrderByNameAsc(semester.getId()).stream()
                .anyMatch(s -> name.equalsIgnoreCase(s.getName()));
        if (!exists) {
            AcademicSection s = new AcademicSection();
            s.setName(name); s.setSemester(semester); s.setActive(true);
            sections.save(s);
        }
    }
}
