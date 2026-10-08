package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "teachers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Teacher {

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
    @Column(length = 200)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String subject;

    /** Faculty code used by the official timetable, e.g. AB, BPS, RR. */
    @Column(name = "faculty_code", length = 30)
    private String facultyCode;

    /** Multiple academic teaching assignments stored as JSON.
     * Each assignment can target a different department/branch/semester/section/subject.
     */
    @Lob
    @Column(name = "teaching_assignments", columnDefinition = "TEXT")
    private String teachingAssignments;

    @Column(length = 100)
    private String qualification;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Status status = Status.ACTIVE;

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}