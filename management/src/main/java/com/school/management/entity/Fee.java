package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;   // NEVER use double/float for money. BigDecimal = exact.
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fees")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Fee {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)

private Long id;

@NotNull
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "student_id", nullable = false)

private Student student;

@NotBlank(message = "Fee type is required")
@Column(name = "fee_type", nullable = false, length = 100)

private String feeType;

@NotNull(message = "Amount is required")
@DecimalMin(value = "0.01", message = "Amount must be positive")
@Column(nullable = false, precision = 10, scale = 2)


private BigDecimal amount;
@NotNull(message = "Due date is required")
@Column(name = "due_date", nullable = false)

private LocalDate dueDate;

@Column(name = "paid_date")

private LocalDate paidDate;           

@Enumerated(EnumType.STRING)
@Column(length = 10)

private FeeStatus status = FeeStatus.PENDING;

public enum FeeStatus { PENDING, PAID, OVERDUE, WAIVED }

@Column(length = 255)

private String remarks;

@Column(name = "created_at", updatable = false)

private LocalDateTime createdAt;

@PrePersist
protected void onCreate() { createdAt = LocalDateTime.now(); }
}
