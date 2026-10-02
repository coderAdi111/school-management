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
                ")",
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
                "WHERE a.student.id = :sid",
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
                "WHERE a.classRoom.id = :cid " +
                "AND a.date = :date",
                Attendance.class
        )
        .setParameter("cid", classId)
        .setParameter("date", date)
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

        Attendance attendance =
                em.find(Attendance.class, id);

        if (attendance != null) {
            em.remove(attendance);
        }
    }
}
