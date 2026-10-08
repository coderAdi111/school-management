package com.school.management.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "timetable_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimetableEntry {

    @Column(length = 120)
    private String department = "Computer Science And Engineering";
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 20)
    private String branch = "IT";

    @Column(nullable = false)
    private Integer semester = 5;

    @NotBlank
    @Column(nullable = false, length = 10)
    private String section;

    @Column(length = 50)
    private String sectionGroup;

    @NotBlank
    @Column(nullable = false, length = 12)
    private String dayOfWeek;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String subject;

    @Column(length = 120)
    private String faculty;

    @Column(length = 80)
    private String room;

    @NotBlank
    @Column(nullable = false, length = 5)
    private String startTime;

    @NotBlank
    @Column(nullable = false, length = 5)
    private String endTime;

    @Column(nullable = false)
    private Boolean practical = false;
}
