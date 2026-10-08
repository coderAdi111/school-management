package com.school.management;

import com.school.management.Dao.TimetableDao;
import com.school.management.entity.TimetableEntry;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(4)
public class TimetableAcademicMigrationSeeder implements CommandLineRunner {
    private final TimetableDao dao;

    public TimetableAcademicMigrationSeeder(TimetableDao dao) { this.dao = dao; }

    @Override
    public void run(String... args) {
        // Existing timetable rows were created before department/group fields existed.
        // Keep them visible under the current CSE/IT academic structure and infer groups
        // such as CA1 + CA2 -> CA and CB1 + CB2 -> CB.
        var all = dao.findAll();
        boolean changed = false;
        for (TimetableEntry e : all) {
            if (e.getDepartment() == null || e.getDepartment().isBlank()) {
                e.setDepartment("Computer Science And Engineering");
                changed = true;
            }
            if (e.getSectionGroup() == null || e.getSectionGroup().isBlank()) {
                e.setSectionGroup(groupOf(e.getSection()));
                changed = true;
            }
        }
        if (changed) dao.saveAll(all);
    }

    private String groupOf(String section) {
        if (section == null || section.isBlank()) return section;
        return section.replaceFirst("\\d+$", "");
    }
}
