package com.school.management.Controller;

import com.school.management.Service.TeacherService;
import com.school.management.entity.Teacher;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teachers")
@CrossOrigin(origins = "http://localhost:4200")
public class TeacherController {

    private final TeacherService teacherService;

    public TeacherController(
            TeacherService teacherService
    ) {
        this.teacherService = teacherService;
    }

    // =========================
    // GET ALL TEACHERS
    // =========================

    @GetMapping
    public List<Teacher> getAllTeachers() {
        return teacherService.getAllTeachers();
    }

    // =========================
    // GET TEACHER BY ID
    // =========================

    @GetMapping("/{id}")
    public ResponseEntity<Teacher> getTeacherById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                teacherService.getTeacherById(id)
        );
    }

    // =========================
    // SEARCH
    // =========================

    @GetMapping("/search")
    public List<Teacher> searchTeachers(
            @RequestParam String name
    ) {
        return teacherService.searchTeachers(name);
    }

    // =========================
    // CREATE
    // =========================

    @PostMapping
    public ResponseEntity<Teacher> createTeacher(
            @RequestBody Teacher teacher
    ) {

        Teacher saved =
                teacherService.saveTeacher(teacher);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    // =========================
    // UPDATE
    // =========================

    @PutMapping("/{id}")
    public ResponseEntity<Teacher> updateTeacher(
            @PathVariable Long id,
            @RequestBody Teacher teacher
    ) {

        return ResponseEntity.ok(
                teacherService.updateTeacher(
                        id,
                        teacher
                )
        );
    }

    // =========================
    // DELETE
    // =========================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacher(
            @PathVariable Long id
    ) {

        teacherService.deleteTeacher(id);

        return ResponseEntity.noContent().build();
    }
}