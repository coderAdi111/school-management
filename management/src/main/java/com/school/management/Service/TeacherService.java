package com.school.management.Service;

import com.school.management.Dao.TeacherDao;
import com.school.management.entity.TimetableEntry;
import com.school.management.entity.Teacher;

import jakarta.transaction.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class TeacherService {

    private final TeacherDao teacherDao;
    @PersistenceContext
    private EntityManager entityManager;

    private String normalizeCode(String code) {
        if (code == null) return null;
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private void updateTimetableFacultyCode(String oldCode, String newCode) {
        var query = entityManager.createQuery(
                "UPDATE TimetableEntry t SET t.faculty = :newCode " +
                "WHERE LOWER(TRIM(t.faculty)) = LOWER(TRIM(:oldCode))"
        );
        query.setParameter("oldCode", oldCode);
        query.setParameter("newCode", newCode == null ? "" : newCode);
        query.executeUpdate();
    }


    public TeacherService(TeacherDao teacherDao) {
        this.teacherDao = teacherDao;
    }

    // =========================
    // GET ALL TEACHERS
    // =========================

    public List<Teacher> getAllTeachers() {
        return teacherDao.findAll();
    }

    // =========================
    // GET TEACHER BY ID
    // =========================

    public Teacher getTeacherById(Long id) {

        return teacherDao.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Teacher not found with id: " + id
                        )
                );
    }

    // =========================
    // SEARCH TEACHERS
    // =========================

    public List<Teacher> searchTeachers(String name) {
        return teacherDao.findByName(name);
    }

    // =========================
    // CREATE / UPDATE
    // =========================

    public Teacher saveTeacher(Teacher teacher) {
        return teacherDao.save(teacher);
    }

    // =========================
    // UPDATE
    // =========================

    @Transactional
    public Teacher updateTeacher(
            Long id,
            Teacher updated
    ) {

        Teacher existing =
                getTeacherById(id);

        existing.setFirstName(
                updated.getFirstName()
        );

        existing.setLastName(
                updated.getLastName()
        );

        existing.setEmail(
                updated.getEmail()
        );

        existing.setPhone(
                updated.getPhone()
        );

        String oldFacultyCode = normalizeCode(existing.getFacultyCode());

        existing.setSubject(
                updated.getSubject()
        );

        existing.setQualification(
                updated.getQualification()
        );

        existing.setFacultyCode(
                normalizeCode(updated.getFacultyCode())
        );

        existing.setStatus(
                updated.getStatus()
        );

        Teacher saved = teacherDao.save(existing);

        // Timetable entries store the faculty code (AB, BPS, RR, ...).
        // When a teacher's code is edited, keep the Weekly Timetable linked
        // to the same teacher by replacing the old code in I1/I2 entries.
        String newFacultyCode = normalizeCode(saved.getFacultyCode());
        if (oldFacultyCode != null && !oldFacultyCode.equals(newFacultyCode)) {
            updateTimetableFacultyCode(oldFacultyCode, newFacultyCode);
        }

        return saved;
    }

    // =========================
    // DELETE
    // =========================

    @Transactional
    public void deleteTeacher(Long id) {

        Teacher existing = getTeacherById(id);
        existing.setStatus(Teacher.Status.INACTIVE);
        teacherDao.save(existing);
    }
}