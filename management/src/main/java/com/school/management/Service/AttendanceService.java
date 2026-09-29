package com.school.management.Service;

import com.school.management.Dao.AttendanceDao;
import com.school.management.Dao.StudentDao;
import com.school.management.Dao.ClassRoomDao;

import com.school.management.entity.Attendance;
import com.school.management.entity.Student;
import com.school.management.entity.ClassRoom;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class AttendanceService {

    private final AttendanceDao attendanceDao;
    private final StudentDao studentDao;
    private final ClassRoomDao classRoomDao;

    public AttendanceService(
            AttendanceDao attendanceDao,
            StudentDao studentDao,
            ClassRoomDao classRoomDao
    ) {
        this.attendanceDao = attendanceDao;
        this.studentDao = studentDao;
        this.classRoomDao = classRoomDao;
    }

    // =========================
    // CREATE ATTENDANCE
    // =========================

    @Transactional
    public Attendance markAttendance(
            Long studentId,
            Long classId,
            LocalDate date,
            Attendance.AttendanceStatus status,
            String remarks
    ) {

        Student student = studentDao.findById(studentId)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Student not found"
                        )
                );

        ClassRoom classRoom = classRoomDao.findById(classId)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Class not found"
                        )
                );

        Attendance record = new Attendance();

        record.setStudent(student);
        record.setClassRoom(classRoom);
        record.setDate(date);
        record.setStatus(status);
        record.setRemarks(remarks);

        return attendanceDao.save(record);
    }

    // =========================
    // GET ALL ATTENDANCE
    // =========================

    public List<Attendance> getAllAttendance() {

        return attendanceDao.findAll();
    }

    // =========================
    // GET BY CLASS + DATE
    // =========================

    public List<Attendance> getAttendanceForClassOnDate(
            Long classId,
            LocalDate date
    ) {

        return attendanceDao.findByClassRoomIdAndDate(
                classId,
                date
        );
    }

    // =========================
    // UPDATE ATTENDANCE
    // =========================

    @Transactional
    public Attendance updateAttendance(
            Long id,
            Attendance.AttendanceStatus status,
            String remarks
    ) {

        Attendance existing =
                attendanceDao.findById(id);

        if (existing == null) {

            throw new RuntimeException(
                    "Attendance not found: " + id
            );
        }

        existing.setStatus(status);
        existing.setRemarks(remarks);

        return attendanceDao.save(existing);
    }

    // =========================
    // PRESENT COUNT
    // =========================

    public long getStudentPresentCount(
            Long studentId,
            LocalDate from,
            LocalDate to
    ) {

        return attendanceDao.countPresent(
                studentId,
                from,
                to
        );
    }
}