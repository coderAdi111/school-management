package com.school.management.repository;

import com.school.management.entity.AcademicSection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AcademicSectionRepository extends JpaRepository<AcademicSection, Long> {
    List<AcademicSection> findBySemesterIdAndActiveTrueOrderByNameAsc(Long semesterId);
}
