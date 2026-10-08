package com.school.management.repository;

import com.school.management.entity.AcademicSemester;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AcademicSemesterRepository extends JpaRepository<AcademicSemester, Long> {
    List<AcademicSemester> findByBranchIdAndActiveTrueOrderBySemesterNumberAsc(Long branchId);
}
