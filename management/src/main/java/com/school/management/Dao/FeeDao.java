package com.school.management.Dao;

import com.school.management.entity.Fee;

import java.util.List;
import java.util.Optional;

public interface FeeDao {

    List<Fee> findAll();

    List<Fee> findByStudentId(Long studentId);

    Optional<Fee> findByFeeId(Long feeId);

    List<Fee> findByStatus(Fee.FeeStatus status);

    List<Fee> findByStudentIdAndStatus(
            Long studentId,
            Fee.FeeStatus status
    );

    Fee save(Fee fee);

    void delete(Long id);
}