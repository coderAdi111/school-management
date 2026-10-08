package com.school.management.Controller;

import com.school.management.entity.*;
import com.school.management.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/academics")
public class AcademicController {

    private final DepartmentRepository departments;
    private final BranchRepository branches;
    private final AcademicSemesterRepository semesters;
    private final AcademicSectionRepository sections;

    public AcademicController(
            DepartmentRepository departments,
            BranchRepository branches,
            AcademicSemesterRepository semesters,
            AcademicSectionRepository sections) {

        this.departments = departments;
        this.branches = branches;
        this.semesters = semesters;
        this.sections = sections;
    }

    // =========================================================
    // DEPARTMENTS
    // =========================================================

    @GetMapping("/departments")
    public List<Department> departments() {
        return departments.findByActiveTrueOrderByNameAsc();
    }

    @PostMapping("/departments")
    public ResponseEntity<Department> createDepartment(
            @RequestBody Department item) {

        item.setId(null);

        // IMPORTANT: active must never be null
        item.setActive(true);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(departments.save(item));
    }

    @PutMapping("/departments/{id}")
    public ResponseEntity<Department> updateDepartment(
            @PathVariable Long id,
            @RequestBody Department item) {

        return departments.findById(id).map(existing -> {

            existing.setName(item.getName());
            existing.setCode(item.getCode());

            existing.setActive(
                    item.getActive() == null || item.getActive()
            );

            return ResponseEntity.ok(
                    departments.save(existing)
            );

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    @DeleteMapping("/departments/{id}")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable Long id) {

        return departments.findById(id).map(existing -> {

            existing.setActive(false);

            departments.save(existing);

            return ResponseEntity
                    .noContent()
                    .<Void>build();

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    // =========================================================
    // BRANCHES
    // =========================================================

    @GetMapping("/branches")
    public List<Branch> branches(
            @RequestParam Long departmentId) {

        return branches
                .findByDepartmentIdAndActiveTrueOrderByNameAsc(
                        departmentId
                );
    }

    @PostMapping("/branches")
    public ResponseEntity<Branch> createBranch(
            @RequestBody Branch item) {

        // Department required
        if (item.getDepartment() == null ||
                item.getDepartment().getId() == null) {

            return ResponseEntity.badRequest().build();
        }

        // Find actual department from database
        Department department =
                departments.findById(
                        item.getDepartment().getId()
                ).orElse(null);

        if (department == null) {
            return ResponseEntity.badRequest().build();
        }

        // New branch
        item.setId(null);

        // Attach real department entity
        item.setDepartment(department);

        // IMPORTANT FIX
        // Database active column cannot be NULL
        item.setActive(true);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(branches.save(item));
    }

    @PutMapping("/branches/{id}")
    public ResponseEntity<Branch> updateBranch(
            @PathVariable Long id,
            @RequestBody Branch item) {

        return branches.findById(id).map(existing -> {

            existing.setName(item.getName());
            existing.setCode(item.getCode());

            existing.setActive(
                    item.getActive() == null || item.getActive()
            );

            return ResponseEntity.ok(
                    branches.save(existing)
            );

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    @DeleteMapping("/branches/{id}")
    public ResponseEntity<Void> deleteBranch(
            @PathVariable Long id) {

        return branches.findById(id).map(existing -> {

            existing.setActive(false);

            branches.save(existing);

            return ResponseEntity
                    .noContent()
                    .<Void>build();

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    // =========================================================
    // SEMESTERS
    // =========================================================

    @GetMapping("/semesters")
    public List<AcademicSemester> semesters(
            @RequestParam Long branchId) {

        return semesters
                .findByBranchIdAndActiveTrueOrderBySemesterNumberAsc(
                        branchId
                );
    }

    @PostMapping("/semesters")
    public ResponseEntity<AcademicSemester> createSemester(
            @RequestBody AcademicSemester item) {

        // Branch required
        if (item.getBranch() == null ||
                item.getBranch().getId() == null) {

            return ResponseEntity.badRequest().build();
        }

        // Find actual branch
        Branch branch =
                branches.findById(
                        item.getBranch().getId()
                ).orElse(null);

        if (branch == null) {
            return ResponseEntity.badRequest().build();
        }

        // New semester
        item.setId(null);

        // Attach real branch
        item.setBranch(branch);

        // IMPORTANT
        item.setActive(true);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(semesters.save(item));
    }

    @PutMapping("/semesters/{id}")
    public ResponseEntity<AcademicSemester> updateSemester(
            @PathVariable Long id,
            @RequestBody AcademicSemester item) {

        return semesters.findById(id).map(existing -> {

            existing.setSemesterNumber(
                    item.getSemesterNumber()
            );

            existing.setName(item.getName());

            existing.setActive(
                    item.getActive() == null || item.getActive()
            );

            return ResponseEntity.ok(
                    semesters.save(existing)
            );

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    @DeleteMapping("/semesters/{id}")
    public ResponseEntity<Void> deleteSemester(
            @PathVariable Long id) {

        return semesters.findById(id).map(existing -> {

            existing.setActive(false);

            semesters.save(existing);

            return ResponseEntity
                    .noContent()
                    .<Void>build();

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    // =========================================================
    // SECTIONS
    // =========================================================

    @GetMapping("/sections")
    public List<AcademicSection> sections(
            @RequestParam Long semesterId) {

        return sections
                .findBySemesterIdAndActiveTrueOrderByNameAsc(
                        semesterId
                );
    }

    @PostMapping("/sections")
    public ResponseEntity<AcademicSection> createSection(
            @RequestBody AcademicSection item) {

        // Semester required
        if (item.getSemester() == null ||
                item.getSemester().getId() == null) {

            return ResponseEntity.badRequest().build();
        }

        // Find actual semester
        AcademicSemester semester =
                semesters.findById(
                        item.getSemester().getId()
                ).orElse(null);

        if (semester == null) {
            return ResponseEntity.badRequest().build();
        }

        // New section
        item.setId(null);

        // Attach real semester
        item.setSemester(semester);

        // IMPORTANT
        item.setActive(true);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(sections.save(item));
    }

    @PutMapping("/sections/{id}")
    public ResponseEntity<AcademicSection> updateSection(
            @PathVariable Long id,
            @RequestBody AcademicSection item) {

        return sections.findById(id).map(existing -> {

            existing.setName(item.getName());

            existing.setActive(
                    item.getActive() == null || item.getActive()
            );

            return ResponseEntity.ok(
                    sections.save(existing)
            );

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }

    @DeleteMapping("/sections/{id}")
    public ResponseEntity<Void> deleteSection(
            @PathVariable Long id) {

        return sections.findById(id).map(existing -> {

            existing.setActive(false);

            sections.save(existing);

            return ResponseEntity
                    .noContent()
                    .<Void>build();

        }).orElseGet(() ->
                ResponseEntity.notFound().build()
        );
    }
}