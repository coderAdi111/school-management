package com.school.management.Controller;

import com.school.management.Dao.TimetableDao;
import com.school.management.Service.TimetableService;
import com.school.management.entity.TimetableEntry;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/timetable")

public class TimetableController {
    private final TimetableDao timetableDao;
    private final TimetableService timetableService;

    public TimetableController(TimetableDao timetableDao, TimetableService timetableService) {
        this.timetableDao = timetableDao;
        this.timetableService = timetableService;
    }

    @GetMapping
    public List<TimetableEntry> getEntries(
            @RequestParam(defaultValue = "Computer Science And Engineering") String department,
            @RequestParam(defaultValue = "IT") String branch,
            @RequestParam(defaultValue = "5") Integer semester,
            @RequestParam String section) {
        return timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                department, branch, semester, section);
    }

    /**
     * Returns the complete timetable dataset. Teacher Schedule uses this
     * endpoint so a selected teacher can be shown across every department,
     * branch, semester and section.
     */
    @GetMapping("/all")
    public List<TimetableEntry> getAllEntries() {
        return timetableDao.findAll();
    }

    @PostMapping
    public ResponseEntity<TimetableEntry> create(@RequestBody TimetableEntry entry) {
        TimetableEntry saved = timetableService.createWithDuplicateProtection(entry);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkUpsert(
            @RequestParam(defaultValue = "merge") String mode,
            @RequestBody List<TimetableEntry> entries) {
        try {
            List<TimetableEntry> saved = timetableService.bulkUpsert(entries, mode);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/duplicates")
    public ResponseEntity<Map<String, Object>> getDuplicates() {
        return ResponseEntity.ok(timetableService.analyzeDuplicates());
    }

    @GetMapping("/subjects")
    public List<String> getSubjects(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String section) {
        if (department == null || branch == null || semester == null || section == null) {
            return java.util.Collections.emptyList();
        }
        return timetableService.getSubjectsForSection(department, branch, semester, section);
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<TimetableEntry> update(@PathVariable Long id, @RequestBody TimetableEntry entry) {
        return timetableDao.findById(id).map(existing -> {
            entry.setId(id);
            return ResponseEntity.ok(timetableDao.save(entry));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Updates every copy of a grouped timetable class (for example CA1 + CA2)
     * that belongs to the same day/time slot.
     */
    @PutMapping("/group/{id:\\d+}")
    public ResponseEntity<TimetableEntry> updateGroup(@PathVariable Long id, @RequestBody TimetableEntry entry) {
        return timetableDao.findById(id).map(existing -> {
            if (existing.getSectionGroup() == null || existing.getSectionGroup().isBlank()) {
                entry.setId(id);
                return ResponseEntity.ok(timetableDao.save(entry));
            }

            List<TimetableEntry> siblings = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionGroupIgnoreCaseAndDayOfWeekIgnoreCaseAndStartTimeAndEndTime(
                    existing.getDepartment(), existing.getBranch(), existing.getSemester(), existing.getSectionGroup(),
                    existing.getDayOfWeek(), existing.getStartTime(), existing.getEndTime());

            for (TimetableEntry sibling : siblings) {
                sibling.setDepartment(entry.getDepartment());
                sibling.setBranch(entry.getBranch());
                sibling.setSemester(entry.getSemester());
                sibling.setSubject(entry.getSubject());
                sibling.setFaculty(entry.getFaculty());
                sibling.setRoom(entry.getRoom());
                sibling.setDayOfWeek(entry.getDayOfWeek());
                sibling.setStartTime(entry.getStartTime());
                sibling.setEndTime(entry.getEndTime());
                sibling.setPractical(entry.getPractical());
                sibling.setSectionGroup(existing.getSectionGroup());
            }
            timetableDao.saveAll(siblings);
            return ResponseEntity.ok(siblings.stream().filter(x -> id.equals(x.getId())).findFirst().orElse(existing));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!timetableDao.existsById(id)) return ResponseEntity.notFound().build();
        timetableDao.deleteById(id);
        return ResponseEntity.noContent().build();
    }


    /**
     * Fast scoped delete: removes all timetable rows for the selected
     * department/branch/semester and only the supplied section list in one
     * database batch instead of making one DELETE request per timetable row.
     */
    @DeleteMapping("/scoped")
    public ResponseEntity<Integer> deleteScoped(
            @RequestParam String department,
            @RequestParam String branch,
            @RequestParam Integer semester,
            @RequestParam List<String> sections) {
        if (sections == null || sections.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<String> normalizedSections = sections.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .map(String::toLowerCase)
                .distinct()
                .toList();

        if (normalizedSections.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Also delete rows by their shared group (CA -> CA1 + CA2, etc.).
        // This protects against legacy rows where sectionGroup is populated
        // but section text has whitespace/casing differences.
        List<String> groups = normalizedSections.stream()
                .map(s -> s.replaceFirst("\\d+$", ""))
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();

        List<TimetableEntry> entries = timetableDao.findScopedEntries(
                department, branch, semester, normalizedSections, groups);

        if (!entries.isEmpty()) {
            timetableDao.deleteAllInBatch(entries);
        }

        return ResponseEntity.ok(entries.size());
    }

    @DeleteMapping("/group/{id:\\d+}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        return timetableDao.findById(id).map(existing -> {
            if (existing.getSectionGroup() == null || existing.getSectionGroup().isBlank()) {
                timetableDao.deleteById(id);
            } else {
                List<TimetableEntry> siblings = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionGroupIgnoreCaseAndDayOfWeekIgnoreCaseAndStartTimeAndEndTime(
                        existing.getDepartment(), existing.getBranch(), existing.getSemester(), existing.getSectionGroup(),
                        existing.getDayOfWeek(), existing.getStartTime(), existing.getEndTime());
                timetableDao.deleteAll(siblings);
            }
            return ResponseEntity.noContent().<Void>build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
