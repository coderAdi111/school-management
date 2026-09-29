package com.school.management.Service;

import com.school.management.Dao.FeeDao;
import com.school.management.entity.Fee;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FeeService {

    private final FeeDao feeDao;

    public FeeService(FeeDao feeDao) {
        this.feeDao = feeDao;
    }

    // Get all fees
    public List<Fee> getAllFees() {
        return feeDao.findAll();
    }

    // Get fee by ID
    public Fee getFeeByFeeId(Long feeId) {

        return feeDao.findByFeeId(feeId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Fees does not exist with id: " + feeId
                        )
                );
    }

    // Get fees by student
    public List<Fee> getFeesByStudentId(Long studentId) {
        return feeDao.findByStudentId(studentId);
    }

    // Get fees by status
    public List<Fee> getFeesByStatus(
            Fee.FeeStatus status
    ) {
        return feeDao.findByStatus(status);
    }

    // Get fees by student and status
    public List<Fee> getFeesByStudentIdAndStatus(
            Long studentId,
            Fee.FeeStatus status
    ) {
        return feeDao.findByStudentIdAndStatus(
                studentId,
                status
        );
    }

    // Create fee
    public Fee saveFees(Fee fee) {
        return feeDao.save(fee);
    }

    // Delete fee
    public void deleteFees(Long feeId) {

        getFeeByFeeId(feeId);

        feeDao.delete(feeId);
    }

    // Update fee
    @Transactional
    public Fee updateFee(
            Long id,
            Fee updated
    ) {

        Fee existing = getFeeByFeeId(id);

        existing.setAmount(updated.getAmount());
        existing.setStatus(updated.getStatus());
        existing.setDueDate(updated.getDueDate());
        existing.setPaidDate(updated.getPaidDate());

        return feeDao.save(existing);
    }
}