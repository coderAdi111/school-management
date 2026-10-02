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

        return em.createQuery(
                "SELECT s FROM Student s " +
                "JOIN FETCH s.classRoom c " +
                "WHERE c.grade = :grade " +
                "AND c.section IN :sections " +
                "AND s.status = :status",
                Student.class
        )
        .setParameter("grade", "5th Semester")
        .setParameter("sections", List.of("I1", "I2"))
        .setParameter("status", Student.Status.ACTIVE)
        .getResultList();
    }

    @Override
    public Optional<Student> findById(Long id) {

        return Optional.ofNullable(
                em.find(Student.class, id)
        );
    }

    @Override
    public Optional<Student> findByEmail(String email) {

        TypedQuery<Student> query = em.createQuery(
                "SELECT s FROM Student s " +
                "WHERE s.email = :email",
                Student.class
        );

        query.setParameter("email", email);

        List<Student> results =
                query.getResultList();

        return results.isEmpty()
                ? Optional.empty()
                : Optional.of(results.get(0));
    }

    @Override
    public List<Student> findByClassRoomId(Long classId) {

        return em.createQuery(
                "SELECT s FROM Student s " +
                "WHERE s.classRoom.id = :classId " +
                "AND s.status = :status",
                Student.class
        )
        .setParameter("classId", classId)
        .setParameter("status", Student.Status.ACTIVE)
        .getResultList();
    }

    @Override
    public List<Student> searchByName(String name) {

        return em.createQuery(
                "SELECT s FROM Student s " +
                "JOIN FETCH s.classRoom c " +
                "WHERE (" +
                "LOWER(s.firstName) LIKE LOWER(CONCAT('%', :name, '%')) OR " +
                "LOWER(s.lastName) LIKE LOWER(CONCAT('%', :name, '%'))" +
                ") " +
                "AND c.grade = :grade " +
                "AND c.section IN :sections " +
                "AND s.status = :status",
                Student.class
        )
        .setParameter("name", name)
        .setParameter("grade", "5th Semester")
        .setParameter("sections", List.of("I1", "I2"))
        .setParameter("status", Student.Status.ACTIVE)
        .getResultList();
    }

    @Override
    @Transactional
    public Student save(Student student) {

        if (student.getId() == null) {

            em.persist(student);

            return student;
        }

        return em.merge(student);
    }

    @Override
    @Transactional
    public void delete(Long id) {

        deactivateStudent(id);
    }

    /**
     * Soft delete student directly in database.
     *
     * Student remains in DB so Attendance / Marks / Fees
     * foreign-key references remain safe.
     */
    @Override
    @Transactional
    public int deactivateStudent(Long id) {

        int updated = em.createQuery(
                "UPDATE Student s " +
                "SET s.status = :status, " +
                "s.classRoom = NULL " +
                "WHERE s.id = :id"
        )
        .setParameter(
                "status",
                Student.Status.INACTIVE
        )
        .setParameter("id", id)
        .executeUpdate();

        em.clear();

        return updated;
    }
}