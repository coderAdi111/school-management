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

    long countPresent(
            Long studentId,
            LocalDate from,
            LocalDate to
    );

    Attendance findById(Long id);

    Attendance save(Attendance attendance);

    void delete(Long id);
}