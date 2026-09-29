package com.school.management.Service;

import com.school.management.Dao.ClassRoomDao;
import com.school.management.Dao.TeacherDao;
import com.school.management.entity.ClassRoom;
import com.school.management.entity.Teacher;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClassRoomService {

    private final ClassRoomDao classRoomDao;
    private final TeacherDao teacherDao;

    public ClassRoomService(
            ClassRoomDao classRoomDao,
            TeacherDao teacherDao
    ) {
        this.classRoomDao = classRoomDao;
        this.teacherDao = teacherDao;
    }

    // =========================
    // GET ALL CLASSES
    // =========================

    public List<ClassRoom> getAllClassRooms() {
        return classRoomDao.findAll();
    }

    // =========================
    // GET CLASS BY ID
    // =========================

    public ClassRoom getClassRoomById(Long id) {
        return classRoomDao.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Class not found with id: " + id
                        )
                );
    }

    // =========================
    // CREATE CLASS
    // =========================

    @Transactional
    public ClassRoom createClassRoom(
            ClassRoom classRoom
    ) {

        if (classRoom.getTeacher() != null
                && classRoom.getTeacher().getId() != null) {

            Teacher teacher = teacherDao.findById(
                    classRoom.getTeacher().getId()
            ).orElseThrow(() ->
                    new RuntimeException(
                            "Teacher not found with id: "
                                    + classRoom.getTeacher().getId()
                    )
            );

            classRoom.setTeacher(teacher);
        }

        return classRoomDao.save(classRoom);
    }

    // =========================
    // UPDATE CLASS
    // =========================

    @Transactional
    public ClassRoom updateClassRoom(
            Long id,
            ClassRoom updated
    ) {

        ClassRoom existing =
                getClassRoomById(id);

        existing.setName(
                updated.getName()
        );

        existing.setGrade(
                updated.getGrade()
        );

        existing.setSection(
                updated.getSection()
        );

        existing.setCapacity(
                updated.getCapacity()
        );

        // =========================
        // UPDATE TEACHER
        // =========================

        if (updated.getTeacher() != null
                && updated.getTeacher().getId() != null) {

            Teacher teacher = teacherDao.findById(
                    updated.getTeacher().getId()
            ).orElseThrow(() ->
                    new RuntimeException(
                            "Teacher not found with id: "
                                    + updated.getTeacher().getId()
                    )
            );

            existing.setTeacher(teacher);

        } else {

            existing.setTeacher(null);
        }

        return classRoomDao.save(existing);
    }

    // =========================
    // DELETE CLASS
    // =========================

    @Transactional
    public void deleteClassRoom(Long id) {

        getClassRoomById(id);

        classRoomDao.delete(id);
    }
}