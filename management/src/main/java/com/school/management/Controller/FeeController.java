package com.school.management.Controller;

import com.school.management.Service.FeeService;
import com.school.management.entity.Fee;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fees")

public class FeeController {

    private final FeeService feeService;

    public FeeController(FeeService feeService) {
        this.feeService = feeService;
    }

    // Get all fees
    @GetMapping
    public List<Fee> getAllFees() {
        return feeService.getAllFees();
    }

    // Get fee by ID
    @GetMapping("/{id}")
    public ResponseEntity<Fee> getFeeById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                feeService.getFeeByFeeId(id)
        );
    }

    // Get fees by student
    @GetMapping("/student/{studentId}")
    public List<Fee> getFeesByStudent(
            @PathVariable Long studentId
    ) {
        return feeService.getFeesByStudentId(studentId);
    }

    // Get fees by status
    @GetMapping("/status/{status}")
    public List<Fee> getFeesByStatus(
            @PathVariable Fee.FeeStatus status
    ) {
        return feeService.getFeesByStatus(status);
    }

    // Get fees by student and status
    @GetMapping("/student/{studentId}/status/{status}")
    public List<Fee> getFeesByStudentAndStatus(
            @PathVariable Long studentId,
            @PathVariable Fee.FeeStatus status
    ) {
        return feeService.getFeesByStudentIdAndStatus(
                studentId,
                status
        );
    }

    // Create fee
    @PostMapping
    public ResponseEntity<Fee> createFee(
            @RequestBody Fee fee
    ) {
        Fee saved = feeService.saveFees(fee);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    // Update fee
    @PutMapping("/{id}")
    public ResponseEntity<Fee> updateFee(
            @PathVariable Long id,
            @RequestBody Fee fee
    ) {
        return ResponseEntity.ok(
                feeService.updateFee(id, fee)
        );
    }

    // Delete fee
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFee(
            @PathVariable Long id
    ) {
        feeService.deleteFees(id);

        return ResponseEntity.noContent().build();
    }
}