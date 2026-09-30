package com.school.management.Dao;

import com.school.management.entity.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimetableDao extends JpaRepository<TimetableEntry, Long> {
    List<TimetableEntry> findByBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(String branch, Integer semester, String section);
}
