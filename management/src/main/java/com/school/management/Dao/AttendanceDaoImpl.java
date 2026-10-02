package com.school.management.Dao;

import com.school.management.entity.Attendance;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public class AttendanceDaoImpl implements AttendanceDao {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Attendance> findAll() {

        return em.createQuery(
                "SELECT DISTINCT a FROM Attendance a " +
                "JOIN FETCH a.student s " +
                "JOIN FETCH s.classRoom sc " +
                "JOIN FETCH a.classRoom c " +
                "WHERE (" +
                "(sc.grade = :grade AND sc.section IN :sections) " +
                "OR " +
                "(c.grade = :grade AND c.section IN :sections)" +
                ") " +
                "ORDER BY a.date DESC, a.id DESC",
                Attendance.class
        )
        .setParameter("grade", "5th Semester")
        .setParameter("sections", List.of("I1", "I2"))
        .getResultList();
    }

    @Override
    public List<Attendance> findByStudentId(Long studentId) {

        return em.createQuery(
                "SELECT a FROM Attendance a " +
                "JOIN FETCH a.student s " +
                "JOIN FETCH a.classRoom c " +
                "WHERE s.id = :sid " +
                "ORDER BY a.date DESC, a.id DESC",
                Attendance.class
        )
        .setParameter("sid", studentId)
        .getResultList();
    }

    @Override
    public List<Attendance> findByClassRoomIdAndDate(
            Long classId,
            LocalDate date
    ) {

        return em.createQuery(
                "SELECT a FROM Attendance a " +
                "JOIN FETCH a.student s " +
                "JOIN FETCH a.classRoom c " +
                "WHERE c.id = :cid " +
                "AND a.date = :date " +
                "ORDER BY s.id ASC",
                Attendance.class
        )
        .setParameter("cid", classId)
        .setParameter("date", date)
        .getResultList();
    }

    @Override
    public List<Attendance> findByClassRoomIdAndDateAndSubject(
            Long classId,
            LocalDate date,
            String subject
    ) {

        return em.createQuery(
                "SELECT a FROM Attendance a " +
                "JOIN FETCH a.student s " +
                "JOIN FETCH a.classRoom c " +
                "WHERE c.id = :cid " +
                "AND a.date = :date " +
                "AND LOWER(a.subject) = LOWER(:subject) " +
                "ORDER BY s.id ASC",
                Attendance.class
        )
        .setParameter("cid", classId)
        .setParameter("date", date)
        .setParameter("subject", subject)
        .getResultList();
    }

    @Override
    public List<Attendance> findByClassRoomIdAndSubject(
            Long classId,
            String subject
    ) {

        return em.createQuery(
                "SELECT a FROM Attendance a " +
                "JOIN FETCH a.student s " +
                "JOIN FETCH a.classRoom c " +
                "WHERE c.id = :cid " +
                "AND LOWER(a.subject) = LOWER(:subject) " +
                "ORDER BY a.date DESC, s.id ASC",
                Attendance.class
        )
        .setParameter("cid", classId)
        .setParameter("subject", subject)
        .getResultList();
    }

    @Override
    public long countPresent(
            Long studentId,
            LocalDate from,
            LocalDate to
    ) {

        return (long) em.createQuery(
                "SELECT COUNT(a) FROM Attendance a " +
                "WHERE a.student.id = :sid " +
                "AND a.status = 'PRESENT' " +
                "AND a.date BETWEEN :from AND :to"
        )
        .setParameter("sid", studentId)
        .setParameter("from", from)
        .setParameter("to", to)
        .getSingleResult();
    }

    @Override
    public Attendance findByStudentClassDateSubject(
            Long studentId,
            Long classId,
            LocalDate date,
            String subject
    ) {

        List<Attendance> results = em.createQuery(
                "SELECT a FROM Attendance a " +
                "WHERE a.student.id = :studentId " +
                "AND a.classRoom.id = :classId " +
                "AND a.date = :date " +
                "AND (" +
                "(:subject IS NULL AND a.subject IS NULL) " +
                "OR LOWER(a.subject) = LOWER(:subject)" +
                ")",
                Attendance.class
        )
        .setParameter("studentId", studentId)
        .setParameter("classId", classId)
        .setParameter("date", date)
        .setParameter("subject", subject)
        .setMaxResults(1)
        .getResultList();

        return results.isEmpty() ? null : results.get(0);
    }

    @Override
    public Attendance findById(Long id) {
        return em.find(Attendance.class, id);
    }

    @Override
    @Transactional
    public Attendance save(Attendance attendance) {

        if (attendance.getId() == null) {
            em.persist(attendance);
            return attendance;
        }

        return em.merge(attendance);
    }

    @Override
    @Transactional
    public void delete(Long id) {

        Attendance attendance = em.find(Attendance.class, id);

        if (attendance != null) {
            em.remove(attendance);
        }
    }
}
