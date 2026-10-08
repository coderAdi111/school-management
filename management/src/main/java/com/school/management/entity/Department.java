package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "academic_departments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_department_code", columnNames = "code")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 30)
    private String code;

    @Column(nullable = false)
    private Boolean active = true;
}
