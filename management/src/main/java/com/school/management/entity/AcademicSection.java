package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "academic_sections", uniqueConstraints = {
        @UniqueConstraint(name = "uk_section_semester_name", columnNames = {"semester_id", "name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcademicSection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "semester_id", nullable = false)
    private AcademicSemester semester;

    @Column(nullable = false)
    private Boolean active = true;
}
