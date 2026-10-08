package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "classes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClassRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Class name is required")
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "Grade is required")
    @Column(nullable = false, length = 20)
    private String grade;

    @Column(length = 50)
    private String section;

    // Dynamic academic hierarchy metadata. These fields intentionally remain
    // nullable so existing classes continue to work after the schema update.
    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String branch;

    @Column
    private Integer semester;

    // =========================
    // CLASS TEACHER
    // =========================

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    // =========================
    // CAPACITY
    // =========================

    @Column(columnDefinition = "INT DEFAULT 30")
    private Integer capacity = 30;

    // =========================
    // CREATED AT
    // =========================

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}