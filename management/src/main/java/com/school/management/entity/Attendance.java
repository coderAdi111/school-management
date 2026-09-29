package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(

name = "attendance",
uniqueConstraints = @UniqueConstraint(
name = "uq_attendance",
columnNames = {"student_id", "class_id", "date"}
)
)

@Data
@NoArgsConstructor
@AllArgsConstructor

public class Attendance {
    @Id
@GeneratedValue(strategy = GenerationType.IDENTITY)

private Long id;
@NotNull(message = "Student is required")
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "student_id", nullable = false)

private Student student;
@NotNull(message = "Class is required")
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "class_id", nullable = false)

private ClassRoom classRoom;
@NotNull(message = "Date is required")
@Column(nullable = false)

private LocalDate date;
@NotNull(message = "Status is required")
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 10)

private AttendanceStatus status;
public enum AttendanceStatus { PRESENT, ABSENT, LATE, EXCUSED }
@Column(length = 255)

private String remarks;
@Column(name = "created_at", updatable = false)

private LocalDateTime createdAt;

@PrePersist

protected void onCreate() { createdAt = LocalDateTime.now(); }
}
