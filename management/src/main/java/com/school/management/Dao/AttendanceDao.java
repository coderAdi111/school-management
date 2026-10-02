package com.school.management.Dao;

import com.school.management.entity.Attendance;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceDao {

    List<Attendance> findAll();

    List<Attendance> findByStudentId(Long studentId);

    List<Attendance> findByClassRoomIdAndDate(
            Long classId,
            LocalDate date
    );

    List<Attendance> findByClassRoomIdAndDateAndSubject(
            Long classId,
            LocalDate date,
            String subject
    );

    List<Attendance> findByClassRoomIdAndSubject(
            Long classId,
            String subject
    );

    long countPresent(
            Long studentId,
            LocalDate from,
            LocalDate to
    );

    Attendance findById(Long id);

    Attendance findByStudentClassDateSubject(
            Long studentId,
            Long classId,
            LocalDate date,
            String subject
    );

    Attendance save(Attendance attendance);

    void delete(Long id);
}
