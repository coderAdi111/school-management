package com.school.management.Controller;

import com.school.management.Service.MarkService;
import com.school.management.entity.Mark;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/marks")

public class MarkController {

    private final MarkService markService;

    public MarkController(MarkService markService) {
        this.markService = markService;
    }

    // Get all marks
    @GetMapping
    public List<Mark> getAllMarks() {
        return markService.getAllMarks();
    }

    // Get mark by ID
    @GetMapping("/{id}")
    public ResponseEntity<Mark> getMarkById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                markService.getMarksByMarksId(id)
        );
    }

    // Get marks by student
    @GetMapping("/student/{studentId}")
    public List<Mark> getMarksByStudent(
            @PathVariable Long studentId
    ) {
        return markService.getMarksByStudentId(studentId);
    }

    // Get marks by class and subject
    @GetMapping("/class/{classId}/subject/{subject}")
    public List<Mark> getMarksByClassAndSubject(
            @PathVariable Long classId,
            @PathVariable String subject
    ) {
        return markService.getMarksByClassIdAndSubject(
                classId,
                subject
        );
    }

    // Get marks by student and exam type
    @GetMapping("/student/{studentId}/exam/{examType}")
    public List<Mark> getMarksByStudentAndExamType(
            @PathVariable Long studentId,
            @PathVariable String examType
    ) {
        return markService.getMarksByStudentIdAndExamType(
                studentId,
                examType
        );
    }

    // Create mark
    @PostMapping
    public ResponseEntity<Mark> createMark(
            @RequestBody Mark mark
    ) {
        Mark saved = markService.saveMark(mark);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    // Update mark
    @PutMapping("/{id}")
    public ResponseEntity<Mark> updateMark(
            @PathVariable Long id,
            @RequestBody Mark mark
    ) {
        return ResponseEntity.ok(
                markService.updateMarks(id, mark)
        );
    }

    // Delete mark
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMark(
            @PathVariable Long id
    ) {
        markService.delete(id);

        return ResponseEntity.noContent().build();
    }
}