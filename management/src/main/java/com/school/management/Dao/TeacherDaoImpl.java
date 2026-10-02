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
                "WHERE t.status = :status " +
                "AND LOWER(CONCAT(t.firstName, ' ', t.lastName)) IN :names",
                Teacher.class
        )
        .setParameter("status", Teacher.Status.ACTIVE)
        .setParameter("names", List.of(
                "shikha gupta",
                "deepak gupta",
                "rakesh rathi",
                "bhanupriya sharma",
                "avinash bhandiya",
                "sammah rasheed",
                "monica sharma",
                "mangi lal",
                "satya narayan tazi"
        ))
        .getResultList();
    }

    @Override
    public Optional<Teacher> findById(Long id) {

        return Optional.ofNullable(
                em.find(Teacher.class, id)
        );
    }

    @Override
    public List<Teacher> findByName(String name) {

        return em.createQuery(
                "SELECT t FROM Teacher t " +
                "WHERE t.status = :status " +
                "AND LOWER(CONCAT(t.firstName, ' ', t.lastName)) IN :names " +
                "AND (" +
                "LOWER(t.firstName) LIKE LOWER(:name) " +
                "OR LOWER(t.lastName) LIKE LOWER(:name)" +
                ")",
                Teacher.class
        )
        .setParameter("status", Teacher.Status.ACTIVE)
        .setParameter("names", List.of(
                "shikha gupta",
                "deepak gupta",
                "rakesh rathi",
                "bhanupriya sharma",
                "avinash bhandiya",
                "sammah rasheed",
                "monica sharma",
                "mangi lal",
                "satya narayan tazi"
        ))
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

        Teacher teacher = em.find(
                Teacher.class,
                id
        );

        if (teacher != null) {

            em.remove(teacher);
        }
    }
}
