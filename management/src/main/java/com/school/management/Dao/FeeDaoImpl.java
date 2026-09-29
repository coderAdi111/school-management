package com.school.management.Dao;

import com.school.management.entity.Fee;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class FeeDaoImpl implements FeeDao {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Fee> findAll() {

        return em.createQuery(
                "SELECT f FROM Fee f",
                Fee.class
        ).getResultList();
    }

    @Override
    public List<Fee> findByStudentId(Long studentId) {

        return em.createQuery(
                "SELECT f FROM Fee f WHERE f.student.id = :sid",
                Fee.class
        )
        .setParameter("sid", studentId)
        .getResultList();
    }

    @Override
    public Optional<Fee> findByFeeId(Long feeId) {

        return Optional.ofNullable(
                em.find(Fee.class, feeId)
        );
    }

    @Override
    public List<Fee> findByStatus(Fee.FeeStatus status) {

        return em.createQuery(
                "SELECT f FROM Fee f WHERE f.status = :status",
                Fee.class
        )
        .setParameter("status", status)
        .getResultList();
    }

    @Override
    public List<Fee> findByStudentIdAndStatus(
            Long studentId,
            Fee.FeeStatus status
    ) {

        return em.createQuery(
                "SELECT f FROM Fee f " +
                "WHERE f.student.id = :sid " +
                "AND f.status = :status",
                Fee.class
        )
        .setParameter("sid", studentId)
        .setParameter("status", status)
        .getResultList();
    }

    @Override
    @Transactional
    public Fee save(Fee fee) {

        return fee.getId() == null
                ? persist(fee)
                : em.merge(fee);
    }

    private Fee persist(Fee fee) {

        em.persist(fee);
        return fee;
    }

    @Override
    @Transactional
    public void delete(Long id) {

        Fee fee = em.find(Fee.class, id);

        if (fee != null) {
            em.remove(fee);
        }
    }
}