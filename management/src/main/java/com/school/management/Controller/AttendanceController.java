package com.school.management.Controller;

import com.school.management.Service.AttendanceService;
import com.school.management.entity.Attendance;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(
            AttendanceService attendanceService
    ) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public List<Attendance> getAllAttendance() {
        return attendanceService.getAllAttendance();
    }

    @GetMapping("/class/{classId}/date/{date}")
    public List<Attendance> getByClassAndDate(
            @PathVariable Long classId,
            @PathVariable String date,
            @RequestParam(required = false) String subject
    ) {

        LocalDate localDate = LocalDate.parse(date);

        if (subject != null && !subject.trim().isEmpty()) {
            return attendanceService
                    .getAttendanceForClassOnDateAndSubject(
                            classId,
                            localDate,
                            subject
                    );
        }

        return attendanceService
                .getAttendanceForClassOnDate(
                        classId,
                        localDate
                );
    }

    @GetMapping("/class/{classId}/subject/{subject}")
    public List<Attendance> getByClassAndSubject(
            @PathVariable Long classId,
            @PathVariable String subject
    ) {

        return attendanceService
                .getAttendanceForClassAndSubject(
                        classId,
                        subject
                );
    }

    @GetMapping("/student/{studentId}")
    public List<Attendance> getByStudent(
            @PathVariable Long studentId
    ) {

        return attendanceService
                .getAttendanceForStudent(studentId);
    }

    @PostMapping
    public ResponseEntity<Attendance> createAttendance(
            @RequestParam Long studentId,
            @RequestParam Long classId,
            @RequestParam String date,
            @RequestParam(required = false) String subject,
            @RequestParam Attendance.AttendanceStatus status,
            @RequestParam(required = false) String remarks
    ) {

        Attendance created =
                attendanceService.markAttendance(
                        studentId,
                        classId,
                        LocalDate.parse(date),
                        subject,
                        status,
                        remarks
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Attendance> updateAttendance(
            @PathVariable Long id,
            @RequestParam(required = false) String subject,
            @RequestParam Attendance.AttendanceStatus status,
            @RequestParam(required = false) String remarks
    ) {

        Attendance updated =
                attendanceService.updateAttendance(
                        id,
                        subject,
                        status,
                        remarks
                );

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttendance(
            @PathVariable Long id
    ) {

        attendanceService.deleteAttendance(id);

        return ResponseEntity.noContent().build();
    }
}
