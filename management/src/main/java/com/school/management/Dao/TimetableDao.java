package com.school.management.Dao;

import com.school.management.entity.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TimetableDao extends JpaRepository<TimetableEntry, Long> {
    List<TimetableEntry> findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(String department, String branch, Integer semester, String section);

    List<TimetableEntry> findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionGroupIgnoreCaseAndDayOfWeekIgnoreCaseAndStartTimeAndEndTime(
            String department, String branch, Integer semester, String sectionGroup, String dayOfWeek, String startTime, String endTime);

    @Query("select t from TimetableEntry t where lower(trim(t.department)) = lower(trim(:department)) " +
           "and lower(trim(t.branch)) = lower(trim(:branch)) and t.semester = :semester " +
           "and (lower(trim(t.section)) in :sections or lower(trim(coalesce(t.sectionGroup, ''))) in :groups)")
    List<TimetableEntry> findScopedEntries(
            @Param("department") String department,
            @Param("branch") String branch,
            @Param("semester") Integer semester,
            @Param("sections") List<String> sections,
            @Param("groups") List<String> groups);
}
