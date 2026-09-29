package com.school.management.Dao;

import com.school.management.entity.Mark;

import java.util.List;
import java.util.Optional;

public interface MarkDao {

    List<Mark> findAll();

    List<Mark> findByStudentId(Long studentId);

    Optional<Mark> findById(Long id);

    List<Mark> findByClassRoomIdAndSubject(
            Long classId,
            String subject
    );

    List<Mark> findByStudentIdAndExamType(
            Long studentId,
            String examType
    );

    Mark save(Mark mark);

    void delete(Long id);
}