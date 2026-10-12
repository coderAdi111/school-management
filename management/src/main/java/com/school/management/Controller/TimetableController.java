package com.school.management.Controller;

import com.school.management.Dao.TimetableDao;
import com.school.management.Service.TimetableService;
import com.school.management.entity.TimetableEntry;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetable")
public class TimetableController {

    private final TimetableDao timetableDao;
    private final TimetableService timetableService;

    public TimetableController(TimetableDao timetableDao, TimetableService timetableService) {
        this.timetableDao = timetableDao;
        this.timetableService = timetableService;
    }

    /** Validated, duplicate-protected bulk import used by the timetable CSV importer. */
    @PostMapping("/bulk-upsert")
    public ResponseEntity<List<TimetableEntry>> bulkUpsert(
            @RequestBody List<TimetableEntry> entries,
            @RequestParam(defaultValue = "merge") String mode) {
        if (entries == null || entries.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (!"merge".equalsIgnoreCase(mode) && !"overwrite".equalsIgnoreCase(mode)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(timetableService.bulkUpsert(entries, mode));
    }

    /** Returns distinct timetable subjects for attendance subject dropdowns. */
    @GetMapping("/subjects")
    public List<String> getSubjectsForSection(
            @RequestParam String department,
            @RequestParam String branch,
            @RequestParam Integer semester,
            @RequestParam String section) {
        return timetableService.getSubjectsForSection(department, branch, semester, section);
    }

    /**
     * Compatibility method for tests and internal callers.
     * Intentionally has no mapping annotation; /subjects remains a single HTTP endpoint.
     */
    public List<String> getSubjects(
            String department,
            String branch,
            Integer semester,
            String section) {
        return timetableService.getSubjectsForSection(department, branch, semester, section);
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

    @PutMapping("/{id}")
    public ResponseEntity<TimetableEntry> update(@PathVariable Long id, @RequestBody TimetableEntry entry) {
        return timetableDao.findById(id).map(existing -> {
            timetableService.validateAndNormalize(entry, 1);
            entry.setId(id);
            return ResponseEntity.ok(timetableDao.save(entry));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Updates every copy of a grouped timetable class (for example CA1 + CA2)
     * that belongs to the same day/time slot.
     */
    @PutMapping("/group/{id}")
    public ResponseEntity<TimetableEntry> updateGroup(@PathVariable Long id, @RequestBody TimetableEntry entry) {
        timetableService.validateAndNormalize(entry, 1);
        return timetableDao.findById(id).map(existing -> {
            if (existing.getSectionGroup() == null || existing.getSectionGroup().isBlank()) {
                entry.setId(id);
                return ResponseEntity.ok(timetableDao.save(entry));
            }
            List<TimetableEntry> siblings =
                    timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionGroupIgnoreCaseAndDayOfWeekIgnoreCaseAndStartTimeAndEndTime(
                            existing.getDepartment(), existing.getBranch(), existing.getSemester(),
                            existing.getSectionGroup(), existing.getDayOfWeek(),
                            existing.getStartTime(), existing.getEndTime());
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
            return ResponseEntity.ok(
                    siblings.stream().filter(x -> id.equals(x.getId())).findFirst().orElse(existing));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!timetableDao.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        timetableDao.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Fast scoped delete: removes timetable rows only for the selected
     * department/branch/semester and explicitly supplied sections.
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

        // Delete only explicitly selected sections; inferred groups are not safe scopes.
        List<String> noGroups = List.of("__NONE__");
        List<TimetableEntry> entries = timetableDao.findScopedEntries(
                department, branch, semester, normalizedSections, noGroups);
        if (!entries.isEmpty()) {
            timetableDao.deleteAllInBatch(entries);
        }
        return ResponseEntity.ok(entries.size());
    }

    @DeleteMapping("/group/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        return timetableDao.findById(id).map(existing -> {
            if (existing.getSectionGroup() == null || existing.getSectionGroup().isBlank()) {
                timetableDao.deleteById(id);
            } else {
                List<TimetableEntry> siblings =
                        timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionGroupIgnoreCaseAndDayOfWeekIgnoreCaseAndStartTimeAndEndTime(
                                existing.getDepartment(), existing.getBranch(), existing.getSemester(),
                                existing.getSectionGroup(), existing.getDayOfWeek(),
                                existing.getStartTime(), existing.getEndTime());
                timetableDao.deleteAll(siblings);
            }
            return ResponseEntity.noContent().<Void>build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
