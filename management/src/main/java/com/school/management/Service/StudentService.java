package com.school.management.Service;

import com.school.management.Dao.StudentDao;
import com.school.management.entity.Student;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StudentService {

    private final StudentDao studentDao;

    public StudentService(StudentDao studentDao) {
        this.studentDao = studentDao;
    }

    public List<Student> getAllStudents() {
        return studentDao.findAll();
    }

    public Student getStudentById(Long id) {
        return studentDao.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found: " + id));
    }

    public List<Student> searchStudents(String name) {
        return studentDao.searchByName(name);
    }

    public List<Student> getStudentsByClass(Long classId) {
        return studentDao.findByClassRoomId(classId);
    }

    @Transactional
    public Student createStudent(Student student) {
        if (studentDao.findByEmail(student.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered: " + student.getEmail());
        }

        return studentDao.save(student);
    }

    @Transactional
    public Student updateStudent(Long id, Student updated) {
        Student existing = getStudentById(id);

        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        existing.setStatus(updated.getStatus());
        existing.setClassRoom(updated.getClassRoom());

        return studentDao.save(existing);
    }

    @Transactional
    public void deleteStudent(Long id) {
        getStudentById(id);
        studentDao.delete(id);
    }
}