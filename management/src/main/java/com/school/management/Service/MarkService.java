package com.school.management.Service;

import com.school.management.Dao.MarkDao;
import com.school.management.entity.Mark;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MarkService {

    private final MarkDao markDao;

    public MarkService(MarkDao markDao) {
        this.markDao = markDao;
    }

    // Get all marks
    public List<Mark> getAllMarks() {
        return markDao.findAll();
    }

    // Get marks by ID
    public Mark getMarksByMarksId(Long marksId) {

        return markDao.findById(marksId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Marks not found with id: " + marksId
                        )
                );
    }

    // Get marks by student
    public List<Mark> getMarksByStudentId(Long studentId) {

        return markDao.findByStudentId(studentId);
    }

    // Get marks by class and subject
    public List<Mark> getMarksByClassIdAndSubject(
            Long classId,
            String subject
    ) {

        return markDao.findByClassRoomIdAndSubject(
                classId,
                subject
        );
    }

    // Get marks by student and exam type
    public List<Mark> getMarksByStudentIdAndExamType(
            Long studentId,
            String examType
    ) {

        return markDao.findByStudentIdAndExamType(
                studentId,
                examType
        );
    }

    // Create mark
    public Mark saveMark(Mark mark) {

        return markDao.save(mark);
    }

    // Delete mark
    public void delete(Long id) {

        getMarksByMarksId(id);

        markDao.delete(id);
    }

    // Update mark
    @Transactional
    public Mark updateMarks(
            Long id,
            Mark updated
    ) {

        Mark existing = getMarksByMarksId(id);

        existing.setSubject(updated.getSubject());
        existing.setExamType(updated.getExamType());
        existing.setMarksObtained(updated.getMarksObtained());
        existing.setRemarks(updated.getRemarks());

        return markDao.save(existing);
    }
}