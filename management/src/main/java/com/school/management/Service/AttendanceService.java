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

    @Transactional
    public Attendance markAttendance(
            Long studentId,
            Long classId,
            LocalDate date,
            String subject,
            Attendance.AttendanceStatus status,
            String remarks
    ) {

        Student student = studentDao.findById(studentId)
                .orElseThrow(() ->
                        new RuntimeException("Student not found")
                );

        ClassRoom classRoom = classRoomDao.findById(classId)
                .orElseThrow(() ->
                        new RuntimeException("Class not found")
                );

        String cleanSubject =
                subject == null || subject.trim().isEmpty()
                        ? null
                        : subject.trim();

        Attendance existing =
                attendanceDao.findByStudentClassDateSubject(
                        studentId,
                        classId,
                        date,
                        cleanSubject
                );

        if (existing != null) {

            existing.setStatus(status);
            existing.setRemarks(remarks);
            existing.setSubject(cleanSubject);

            return attendanceDao.save(existing);
        }

        Attendance record = new Attendance();

        record.setStudent(student);
        record.setClassRoom(classRoom);
        record.setDate(date);
        record.setSubject(cleanSubject);
        record.setStatus(status);
        record.setRemarks(remarks);

        return attendanceDao.save(record);
    }

    public List<Attendance> getAllAttendance() {
        return attendanceDao.findAll();
    }

    public List<Attendance> getAttendanceForClassOnDate(
            Long classId,
            LocalDate date
    ) {
        return attendanceDao.findByClassRoomIdAndDate(
                classId,
                date
        );
    }

    public List<Attendance> getAttendanceForClassOnDateAndSubject(
            Long classId,
            LocalDate date,
            String subject
    ) {
        return attendanceDao.findByClassRoomIdAndDateAndSubject(
                classId,
                date,
                subject
        );
    }

    public List<Attendance> getAttendanceForClassAndSubject(
            Long classId,
            String subject
    ) {
        return attendanceDao.findByClassRoomIdAndSubject(
                classId,
                subject
        );
    }

    public List<Attendance> getAttendanceForStudent(
            Long studentId
    ) {
        return attendanceDao.findByStudentId(studentId);
    }

    @Transactional
    public Attendance updateAttendance(
            Long id,
            String subject,
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

        if (subject != null && !subject.trim().isEmpty()) {
            existing.setSubject(subject.trim());
        }

        existing.setStatus(status);
        existing.setRemarks(remarks);

        return attendanceDao.save(existing);
    }

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

    @Transactional
    public void deleteAttendance(Long id) {
        attendanceDao.delete(id);
    }
}
