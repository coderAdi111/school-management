package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "academic_semesters", uniqueConstraints = {
        @UniqueConstraint(name = "uk_semester_branch_number", columnNames = {"branch_id", "semester_number"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcademicSemester {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "semester_number", nullable = false)
    private Integer semesterNumber;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(nullable = false)
    private Boolean active = true;
}
