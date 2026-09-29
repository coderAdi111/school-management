package com.school.management.Dao;

import com.school.management.entity.Student;
import java.util.List;
import java.util.Optional;

public interface StudentDao {
List<Student>     findAll();
Optional<Student> findById(Long id);
Optional<Student> findByEmail(String email);
List<Student>     findByClassRoomId(Long classId);
List<Student>     searchByName(String name);        
Student           save(Student student);             
void              delete(Long id);
}

