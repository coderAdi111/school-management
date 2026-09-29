package com.school.management.Service;

import com.school.management.Dao.TeacherDao;
import com.school.management.entity.Teacher;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TeacherService {

    private final TeacherDao teacherDao;

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

        existing.setSubject(
                updated.getSubject()
        );

        existing.setQualification(
                updated.getQualification()
        );

        existing.setStatus(
                updated.getStatus()
        );

        return teacherDao.save(existing);
    }

    // =========================
    // DELETE
    // =========================

    public void deleteTeacher(Long id) {

        getTeacherById(id);

        teacherDao.delete(id);
    }
}