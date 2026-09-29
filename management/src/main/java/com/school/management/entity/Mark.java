package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "marks")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Mark {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)

private Long id;
@NotNull
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "student_id", nullable = false)

private Student student;
@NotNull
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "class_id", nullable = false)

private ClassRoom classRoom;
@NotBlank
@Column(nullable = false, length = 100)

private String subject;
@NotBlank
@Column(name = "exam_type", nullable = false, length = 50)

private String examType;

@NotNull
@DecimalMin("0.00")
@Column(name = "marks_obtained", nullable = false, precision = 5, scale = 2)

private BigDecimal marksObtained;
@NotNull
@DecimalMin("1.00")
@Column(name = "total_marks", nullable = false, precision = 5, scale = 2)

private BigDecimal totalMarks;
@NotNull
@Column(name = "exam_date", nullable = false)

private LocalDate examDate;
@Column(length = 255)

private String remarks;
@Column(name = "created_at", updatable = false)

private LocalDateTime createdAt;

@PrePersist
protected void onCreate() { createdAt = LocalDateTime.now(); }
}

