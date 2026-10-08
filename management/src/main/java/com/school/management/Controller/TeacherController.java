package com.school.management.Controller;

import com.school.management.Service.TeacherService;
import com.school.management.entity.Teacher;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teachers")

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


    /**
     * Creates/updates a teacher from a Weekly Timetable entry and keeps the
     * teacher's teachingAssignments JSON in sync. If the faculty code/name
     * already exists, the existing teacher is reused. If it is new, the
     * frontend must provide fullName once.
     */
    @PostMapping("/sync-from-timetable")
    public ResponseEntity<Teacher> syncFromTimetable(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(teacherService.syncFromTimetable(payload));
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