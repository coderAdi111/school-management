package com.school.management.Controller;

import com.school.management.Dao.TimetableDao;
import com.school.management.entity.TimetableEntry;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/timetable")

public class TimetableController {
    private final TimetableDao timetableDao;

    public TimetableController(TimetableDao timetableDao) {
        this.timetableDao = timetableDao;
    }

    @GetMapping
    public List<TimetableEntry> getEntries(
            @RequestParam(defaultValue = "IT") String branch,
            @RequestParam(defaultValue = "5") Integer semester,
            @RequestParam String section) {
        return timetableDao.findByBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(branch, semester, section);
    }

    @PostMapping
    public ResponseEntity<TimetableEntry> create(@RequestBody TimetableEntry entry) {
        entry.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(timetableDao.save(entry));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TimetableEntry> update(@PathVariable Long id, @RequestBody TimetableEntry entry) {
        return timetableDao.findById(id).map(existing -> {
            entry.setId(id);
            return ResponseEntity.ok(timetableDao.save(entry));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!timetableDao.existsById(id)) return ResponseEntity.notFound().build();
        timetableDao.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
