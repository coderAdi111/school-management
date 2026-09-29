package com.school.management.Dao;

import com.school.management.entity.Teacher;

import java.util.List;
import java.util.Optional;

public interface TeacherDao {

    List<Teacher> findAll();

    Optional<Teacher> findById(Long id);

    List<Teacher> findByName(String name);

    Teacher save(Teacher teacher);

    void delete(Long id);
}