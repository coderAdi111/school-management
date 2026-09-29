package com.school.management.Dao;

import com.school.management.entity.Student;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository

public class StudentDaoImpl implements StudentDao {
    @PersistenceContext

    private EntityManager em;
@Override

public List<Student> findAll() {
    return em.createQuery("SELECT s FROM Student s", Student.class)
.getResultList();
}
@Override

public Optional<Student> findById(Long id) {
    return Optional.ofNullable(em.find(Student.class, id));
}
@Override

public Optional<Student> findByEmail(String email) {
    TypedQuery<Student> q = em.createQuery(
"SELECT s FROM Student s WHERE s.email = :email", Student.class);
q.setParameter("email", email);
List<Student> results = q.getResultList();
return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
}
@Override

public List<Student> findByClassRoomId(Long classId) {
    return em.createQuery(
"SELECT s FROM Student s WHERE s.classRoom.id = :classId", Student.class)
.setParameter("classId", classId)
.getResultList();
}
@Override

public List<Student> searchByName(String name) {
    return em.createQuery(
"SELECT s FROM Student s WHERE " +
"LOWER(s.firstName) LIKE LOWER(CONCAT('%', :name, '%')) OR " +
"LOWER(s.lastName)  LIKE LOWER(CONCAT('%', :name, '%'))",
Student.class)
.setParameter("name", name)
.getResultList();
}
@Override
@Transactional

public Student save(Student student) {
if (student.getId() == null) {
em.persist(student);
return student;
} else {
return em.merge(student);
}
}
@Override
@Transactional

public void delete(Long id) {
Student student = em.find(Student.class, id);
if (student != null) {
em.remove(student);
}
}
}