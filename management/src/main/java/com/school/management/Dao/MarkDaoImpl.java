package com.school.management.Dao;

import com.school.management.entity.Mark;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class MarkDaoImpl implements MarkDao {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Mark> findAll() {

        return em.createQuery(
                "SELECT m FROM Mark m",
                Mark.class
        ).getResultList();
    }

    @Override
    public Optional<Mark> findById(Long id) {

        return Optional.ofNullable(
                em.find(Mark.class, id)
        );
    }

    @Override
    public List<Mark> findByStudentId(Long studentId) {

        return em.createQuery(
                "SELECT m FROM Mark m WHERE m.student.id = :sid",
                Mark.class
        )
        .setParameter("sid", studentId)
        .getResultList();
    }

    @Override
    public List<Mark> findByClassRoomIdAndSubject(
            Long classId,
            String subject
    ) {

        return em.createQuery(
                "SELECT m FROM Mark m " +
                "WHERE m.classRoom.id = :cid " +
                "AND m.subject = :sub",
                Mark.class
        )
        .setParameter("cid", classId)
        .setParameter("sub", subject)
        .getResultList();
    }

    @Override
    public List<Mark> findByStudentIdAndExamType(
            Long studentId,
            String examType
    ) {

        return em.createQuery(
                "SELECT m FROM Mark m " +
                "WHERE m.student.id = :sid " +
                "AND m.examType = :type",
                Mark.class
        )
        .setParameter("sid", studentId)
        .setParameter("type", examType)
        .getResultList();
    }

    @Override
    @Transactional
    public Mark save(Mark mark) {

        return mark.getId() == null
                ? persist(mark)
                : em.merge(mark);
    }

    private Mark persist(Mark mark) {

        em.persist(mark);
        return mark;
    }

    @Override
    @Transactional
    public void delete(Long id) {

        Mark mark = em.find(Mark.class, id);

        if (mark != null) {
            em.remove(mark);
        }
    }
}