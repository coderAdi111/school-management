package com.school.management.Dao;

import com.school.management.entity.Teacher;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TeacherDaoImpl implements TeacherDao {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Teacher> findAll() {
        return em.createQuery(
                "SELECT t FROM Teacher t " +
                "WHERE t.status = :status ORDER BY t.firstName, t.lastName",
                Teacher.class
        )
        .setParameter("status", Teacher.Status.ACTIVE)
        .getResultList();
    }

    @Override
    public Optional<Teacher> findById(Long id) {
        return Optional.ofNullable(
                em.find(Teacher.class, id)
        );
    }

    @Override
    public Optional<Teacher> findByFacultyCode(String facultyCode) {
        if (facultyCode == null || facultyCode.trim().isEmpty()) {
            return Optional.empty();
        }

        return em.createQuery(
                "SELECT t FROM Teacher t " +
                "WHERE LOWER(TRIM(t.facultyCode)) = LOWER(TRIM(:code))",
                Teacher.class
        )
        .setParameter("code", facultyCode.trim())
        .getResultStream()
        .findFirst();
    }

    @Override
    public List<Teacher> findByName(String name) {
        return em.createQuery(
                "SELECT t FROM Teacher t " +
                "WHERE t.status = :status " +
                "AND (LOWER(t.firstName) LIKE LOWER(:name) " +
                "OR LOWER(t.lastName) LIKE LOWER(:name) " +
                "OR LOWER(CONCAT(t.firstName, ' ', t.lastName)) LIKE LOWER(:name)) " +
                "ORDER BY t.firstName, t.lastName",
                Teacher.class
        )
        .setParameter("status", Teacher.Status.ACTIVE)
        .setParameter("name", "%" + name + "%")
        .getResultList();
    }

    @Override
    @Transactional
    public Teacher save(Teacher teacher) {
        if (teacher.getId() == null) {
            em.persist(teacher);
            return teacher;
        }

        return em.merge(teacher);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Teacher teacher = em.find(Teacher.class, id);

        if (teacher != null) {
            em.remove(teacher);
        }
    }
}
