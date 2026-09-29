package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Student {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)

private Long id;
@NotBlank(message = "First name is required")
@Column(name = "first_name", nullable = false, length = 100)

private String firstName;
@NotBlank(message = "Last name is required")
@Column(name = "last_name", nullable = false, length = 100)

private String lastName;
@Email(message = "Invalid email format")
@NotBlank(message = "Email is required")
@Column(nullable = false, unique = true, length = 200)

private String email;
@Column(length = 20)

private String phone;
@Column(name = "date_of_birth")

private LocalDate dateOfBirth; 
@Column(columnDefinition = "TEXT")

private String address;
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "class_id")

private ClassRoom classRoom;
@Column(name = "enrollment_date")

private LocalDate enrollmentDate;
@Enumerated(EnumType.STRING)
@Column(length = 20)

private Status status = Status.ACTIVE;
public enum Status { ACTIVE, INACTIVE, GRADUATED }
@Column(name = "created_at", updatable = false)

private LocalDateTime createdAt;
@PrePersist

protected void onCreate() {
createdAt = LocalDateTime.now();
if (enrollmentDate == null) enrollmentDate = LocalDate.now();
}
}
