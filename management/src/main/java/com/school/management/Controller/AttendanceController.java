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
@CrossOrigin(origins = "http://localhost:4200")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(
            AttendanceService attendanceService
    ) {
        this.attendanceService = attendanceService;
    }

    // =========================
    // GET ALL ATTENDANCE
    // =========================

    @GetMapping
    public List<Attendance> getAllAttendance() {
        return attendanceService.getAllAttendance();
    }

    // =========================
    // GET BY CLASS + DATE
    // =========================

    @GetMapping("/class/{classId}/date/{date}")
    public List<Attendance> getByClassAndDate(
            @PathVariable Long classId,
            @PathVariable String date
    ) {
        LocalDate localDate = LocalDate.parse(date);

        return attendanceService.getAttendanceForClassOnDate(
                classId,
                localDate
        );
    }

    // =========================
    // CREATE ATTENDANCE
    // =========================

    @PostMapping
    public ResponseEntity<Attendance> createAttendance(
            @RequestParam Long studentId,
            @RequestParam Long classId,
            @RequestParam String date,
            @RequestParam Attendance.AttendanceStatus status,
            @RequestParam(required = false) String remarks
    ) {
        Attendance created =
                attendanceService.markAttendance(
                        studentId,
                        classId,
                        LocalDate.parse(date),
                        status,
                        remarks
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(created);
    }

    // =========================
    // UPDATE ATTENDANCE
    // =========================

    @PutMapping("/{id}")
    public ResponseEntity<Attendance> updateAttendance(
            @PathVariable Long id,
            @RequestParam Attendance.AttendanceStatus status,
            @RequestParam(required = false) String remarks
    ) {
        Attendance updated =
                attendanceService.updateAttendance(
                        id,
                        status,
                        remarks
                );

        return ResponseEntity.ok(updated);
    }
}