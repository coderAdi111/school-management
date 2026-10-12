package com.school.management.Service;

import com.school.management.Dao.TimetableDao;
import com.school.management.entity.TimetableEntry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TimetableService {

    private static final Set<String> VALID_DAYS = Set.of(
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    );

    private final TimetableDao timetableDao;

    public TimetableService(TimetableDao timetableDao) {
        this.timetableDao = timetableDao;
    }

    public String normalizeTime(String time) {
        if (time == null) return null;
        time = time.trim();
        if (time.matches("^\\d:\\d{2}$")) {
            return "0" + time;
        }
        return time;
    }

    public void validateAndNormalize(TimetableEntry entry, int index) {
        if (entry.getDepartment() == null || entry.getDepartment().trim().isEmpty()) {
            throw new IllegalArgumentException("Row " + index + ": Department is required");
        }
        entry.setDepartment(entry.getDepartment().trim());

        if (entry.getBranch() == null || entry.getBranch().trim().isEmpty()) {
            throw new IllegalArgumentException("Row " + index + ": Branch is required");
        }
        entry.setBranch(entry.getBranch().trim());

        if (entry.getSemester() == null || entry.getSemester() < 1 || entry.getSemester() > 12) {
            throw new IllegalArgumentException("Row " + index + ": Valid semester (1-12) is required");
        }

        if (entry.getSection() == null || entry.getSection().trim().isEmpty()) {
            throw new IllegalArgumentException("Row " + index + ": Section is required");
        }
        if (entry.getSection().trim().length() > 10) {
            throw new IllegalArgumentException("Row " + index + ": Section length cannot exceed 10 characters");
        }
        entry.setSection(entry.getSection().trim().toUpperCase());

        if (entry.getSubject() == null || entry.getSubject().trim().isEmpty()) {
            throw new IllegalArgumentException("Row " + index + ": Subject is required");
        }
        entry.setSubject(entry.getSubject().trim());

        if (entry.getDayOfWeek() == null || entry.getDayOfWeek().trim().isEmpty()) {
            throw new IllegalArgumentException("Row " + index + ": Day of week is required");
        }
        String day = entry.getDayOfWeek().trim();
        if (!VALID_DAYS.contains(day.toLowerCase())) {
            throw new IllegalArgumentException("Row " + index + ": Invalid day of week '" + day + "'");
        }
        // Normalize day to Title Case (e.g. Monday)
        String normalizedDay = day.substring(0, 1).toUpperCase() + day.substring(1).toLowerCase();
        entry.setDayOfWeek(normalizedDay);

        String start = normalizeTime(entry.getStartTime());
        String end = normalizeTime(entry.getEndTime());
        if (start == null || !start.matches("^\\d{2}:\\d{2}$")) {
            throw new IllegalArgumentException("Row " + index + ": Invalid start time '" + entry.getStartTime() + "'. Format must be HH:mm");
        }
        if (end == null || !end.matches("^\\d{2}:\\d{2}$")) {
            throw new IllegalArgumentException("Row " + index + ": Invalid end time '" + entry.getEndTime() + "'. Format must be HH:mm");
        }
        if (start.compareTo(end) >= 0) {
            throw new IllegalArgumentException("Row " + index + ": Start time (" + start + ") must be earlier than end time (" + end + ")");
        }

        entry.setStartTime(start);
        entry.setEndTime(end);

        if (entry.getPractical() == null) {
            entry.setPractical(false);
        }

        if (entry.getFaculty() != null) {
            entry.setFaculty(entry.getFaculty().trim());
        }

        if (entry.getRoom() != null) {
            entry.setRoom(entry.getRoom().trim());
        }

        if (entry.getSectionGroup() != null && !entry.getSectionGroup().trim().isEmpty()) {
            entry.setSectionGroup(entry.getSectionGroup().trim());
        } else {
            String derivedGroup = entry.getSection().replaceAll("\\d+$", "");
            entry.setSectionGroup(derivedGroup.isEmpty() ? entry.getSection() : derivedGroup);
        }
    }

    @Transactional
    public TimetableEntry createWithDuplicateProtection(TimetableEntry entry) {
        validateAndNormalize(entry, 1);
        List<TimetableEntry> existing = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseAndDayOfWeekIgnoreCaseAndStartTime(
                entry.getDepartment(), entry.getBranch(), entry.getSemester(), entry.getSection(), entry.getDayOfWeek(), entry.getStartTime());

        for (TimetableEntry ex : existing) {
            if (ex.getEndTime().equals(entry.getEndTime()) &&
                ex.getSubject().trim().equalsIgnoreCase(entry.getSubject().trim()) &&
                Objects.equals(normalizeStr(ex.getFaculty()), normalizeStr(entry.getFaculty())) &&
                Objects.equals(normalizeStr(ex.getRoom()), normalizeStr(entry.getRoom()))) {
                // Exact clone already exists! Return without creating duplicate
                return ex;
            }
        }
        entry.setId(null);
        return timetableDao.save(entry);
    }

    @Transactional
    public List<TimetableEntry> bulkUpsert(List<TimetableEntry> entries, String mode) {
        if (entries == null || entries.isEmpty()) {
            return Collections.emptyList();
        }

        // Validate all entries first
        for (int i = 0; i < entries.size(); i++) {
            validateAndNormalize(entries.get(i), i + 1);
        }

        boolean overwrite = "overwrite".equalsIgnoreCase(mode);

        if (overwrite) {
            // Group entries by academic scope: department, branch, semester
            Map<String, List<TimetableEntry>> scopeMap = entries.stream().collect(Collectors.groupingBy(e ->
                    e.getDepartment().toLowerCase() + "|" + e.getBranch().toLowerCase() + "|" + e.getSemester()));

            for (List<TimetableEntry> scopeEntries : scopeMap.values()) {
                TimetableEntry first = scopeEntries.get(0);
                List<String> sections = scopeEntries.stream()
                        .map(e -> e.getSection().toLowerCase())
                        .distinct()
                        .toList();
                List<String> groups = scopeEntries.stream()
                        .map(e -> e.getSectionGroup() != null ? e.getSectionGroup().toLowerCase() : "")
                        .filter(g -> !g.isEmpty())
                        .distinct()
                        .toList();

                List<String> safeSections = sections.isEmpty() ? List.of("__NONE__") : sections;
                List<String> safeGroups = groups.isEmpty() ? List.of("__NONE__") : groups;

                List<TimetableEntry> existing = timetableDao.findScopedEntries(
                        first.getDepartment(), first.getBranch(), first.getSemester(), safeSections, safeGroups);

                if (!existing.isEmpty()) {
                    timetableDao.deleteAllInBatch(existing);
                }
            }

            // After deletion, all entries are saved as fresh records
            entries.forEach(e -> e.setId(null));
            return timetableDao.saveAll(entries);
        }

        // Mode: MERGE (Safe Upsert)
        Map<String, List<TimetableEntry>> scopeMap = entries.stream().collect(Collectors.groupingBy(e ->
                e.getDepartment().toLowerCase() + "|" + e.getBranch().toLowerCase() + "|" + e.getSemester()));

        List<TimetableEntry> toSave = new ArrayList<>();

        for (List<TimetableEntry> scopeEntries : scopeMap.values()) {
            TimetableEntry first = scopeEntries.get(0);
            List<String> sections = scopeEntries.stream()
                    .map(e -> e.getSection().toLowerCase())
                    .distinct()
                    .toList();
            List<String> groups = scopeEntries.stream()
                    .map(e -> e.getSectionGroup() != null ? e.getSectionGroup().toLowerCase() : "")
                    .filter(g -> !g.isEmpty())
                    .distinct()
                    .toList();

            List<String> safeSections = sections.isEmpty() ? List.of("__NONE__") : sections;
            List<String> safeGroups = groups.isEmpty() ? List.of("__NONE__") : groups;

            List<TimetableEntry> existingScoped = timetableDao.findScopedEntries(
                    first.getDepartment(), first.getBranch(), first.getSemester(), safeSections, safeGroups);

            // Group existing by slot key: section | day | startTime
            Map<String, List<TimetableEntry>> existingSlots = existingScoped.stream().collect(Collectors.groupingBy(e ->
                    e.getSection().trim().toLowerCase() + "|" +
                    e.getDayOfWeek().trim().toLowerCase() + "|" +
                    e.getStartTime().trim()));

            // Set to keep track of matched existing entry IDs so parallel rows don't claim the same existing row
            Set<Long> matchedExistingIds = new HashSet<>();

            for (TimetableEntry incoming : scopeEntries) {
                String slotKey = incoming.getSection().trim().toLowerCase() + "|" +
                                 incoming.getDayOfWeek().trim().toLowerCase() + "|" +
                                 incoming.getStartTime().trim();

                List<TimetableEntry> slotCandidates = existingSlots.getOrDefault(slotKey, Collections.emptyList());

                // 1. Try to find a candidate matching subject AND (faculty OR room)
                TimetableEntry match = slotCandidates.stream()
                        .filter(c -> !matchedExistingIds.contains(c.getId()))
                        .filter(c -> c.getSubject().trim().equalsIgnoreCase(incoming.getSubject().trim()))
                        .filter(c -> (incoming.getFaculty() != null && !incoming.getFaculty().isEmpty() &&
                                      c.getFaculty() != null && c.getFaculty().trim().equalsIgnoreCase(incoming.getFaculty().trim())) ||
                                     (incoming.getRoom() != null && !incoming.getRoom().isEmpty() &&
                                      c.getRoom() != null && c.getRoom().trim().equalsIgnoreCase(incoming.getRoom().trim())))
                        .findFirst()
                        .orElse(null);

                // 2. If not matched on both, find candidate matching subject alone
                if (match == null) {
                    match = slotCandidates.stream()
                            .filter(c -> !matchedExistingIds.contains(c.getId()))
                            .filter(c -> c.getSubject().trim().equalsIgnoreCase(incoming.getSubject().trim()))
                            .findFirst()
                            .orElse(null);
                }

                // NOTE: We deliberately do NOT fallback to overwriting a different subject when no matching subject exists.
                // If match is null, this incoming class is either in a new slot or a different/parallel subject.
                // It will be saved as a new entry (id = null), preserving existing records.

                if (match != null) {
                    // Update existing entry fields while keeping match.getId()
                    matchedExistingIds.add(match.getId());
                    match.setDepartment(incoming.getDepartment());
                    match.setBranch(incoming.getBranch());
                    match.setSemester(incoming.getSemester());
                    match.setSection(incoming.getSection());
                    match.setSectionGroup(incoming.getSectionGroup());
                    match.setDayOfWeek(incoming.getDayOfWeek());
                    match.setSubject(incoming.getSubject());
                    match.setFaculty(incoming.getFaculty());
                    match.setRoom(incoming.getRoom());
                    match.setStartTime(incoming.getStartTime());
                    match.setEndTime(incoming.getEndTime());
                    match.setPractical(incoming.getPractical());
                    toSave.add(match);
                } else {
                    // New slot or different subject / parallel class: create as new record
                    incoming.setId(null);
                    toSave.add(incoming);
                }
            }
        }

        return timetableDao.saveAll(toSave);
    }

    public Map<String, Object> analyzeDuplicates() {
        List<TimetableEntry> all = timetableDao.findAll();

        Map<String, List<TimetableEntry>> slotGroups = all.stream().collect(Collectors.groupingBy(e ->
                (e.getDepartment() == null ? "" : e.getDepartment().trim().toLowerCase()) + "|" +
                (e.getBranch() == null ? "" : e.getBranch().trim().toLowerCase()) + "|" +
                e.getSemester() + "|" +
                (e.getSection() == null ? "" : e.getSection().trim().toLowerCase()) + "|" +
                (e.getDayOfWeek() == null ? "" : e.getDayOfWeek().trim().toLowerCase()) + "|" +
                (e.getStartTime() == null ? "" : e.getStartTime().trim())
        ));

        int exactClonesCount = 0;
        int parallelOrDifferentCount = 0;
        List<Map<String, Object>> exactClonesList = new ArrayList<>();
        List<Map<String, Object>> parallelList = new ArrayList<>();

        for (Map.Entry<String, List<TimetableEntry>> entry : slotGroups.entrySet()) {
            List<TimetableEntry> group = entry.getValue();
            if (group.size() > 1) {
                Map<String, List<TimetableEntry>> contentGroups = group.stream().collect(Collectors.groupingBy(e ->
                        (e.getSubject() == null ? "" : e.getSubject().trim().toLowerCase()) + "|" +
                        (e.getFaculty() == null ? "" : e.getFaculty().trim().toLowerCase()) + "|" +
                        (e.getRoom() == null ? "" : e.getRoom().trim().toLowerCase()) + "|" +
                        (e.getEndTime() == null ? "" : e.getEndTime().trim())
                ));

                boolean hasClone = false;
                for (List<TimetableEntry> sub : contentGroups.values()) {
                    if (sub.size() > 1) {
                        hasClone = true;
                        exactClonesCount += (sub.size() - 1);
                        exactClonesList.add(Map.of(
                                "slot", entry.getKey(),
                                "subject", sub.get(0).getSubject(),
                                "faculty", sub.get(0).getFaculty() == null ? "" : sub.get(0).getFaculty(),
                                "room", sub.get(0).getRoom() == null ? "" : sub.get(0).getRoom(),
                                "ids", sub.stream().map(TimetableEntry::getId).toList()
                        ));
                    }
                }
                if (!hasClone) {
                    parallelOrDifferentCount += (group.size() - 1);
                    parallelList.add(Map.of(
                            "slot", entry.getKey(),
                            "entries", group.stream().map(e -> Map.of(
                                    "id", e.getId(),
                                    "subject", e.getSubject(),
                                    "faculty", e.getFaculty() == null ? "" : e.getFaculty(),
                                    "room", e.getRoom() == null ? "" : e.getRoom()
                            )).toList()
                    ));
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalEntries", all.size());
        result.put("distinctSlots", slotGroups.size());
        result.put("slotsWithMultipleEntries", slotGroups.values().stream().filter(g -> g.size() > 1).count());
        result.put("redundantExactClonesCount", exactClonesCount);
        result.put("parallelOrConflictingCount", parallelOrDifferentCount);
        result.put("exactClones", exactClonesList);
        result.put("parallelOrConflicting", parallelList);
        result.put("cleanupStrategy", "1. Redundant exact clones (" + exactClonesCount + " records): identical slot, subject, faculty, room, and timing created by repeated CSV imports. Can be safely pruned by keeping the lowest ID for each slot. " +
                "2. Parallel subgroups and OCR artifacts (" + parallelOrDifferentCount + " records): entries sharing the same slot but having different subjects, rooms or OCR fragments (e.g. Lab A vs G 18 B). These should NOT be auto-deleted without admin review to preserve parallel lab batches.");
        return result;
    }

    public List<String> getSubjectsForSection(String department, String branch, Integer semester, String section) {
        if (department == null || department.trim().isEmpty() ||
            branch == null || branch.trim().isEmpty() ||
            semester == null ||
            section == null || section.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String targetSection = section.trim().toUpperCase();
        String group = targetSection.replaceAll("\\d+$", "");

        List<TimetableEntry> entries = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterOrderByDayOfWeekAscStartTimeAsc(
                department.trim(), branch.trim(), semester);

        Map<String, String> uniqueSubjects = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

        for (TimetableEntry entry : entries) {
            if (entry.getSubject() == null || entry.getSubject().trim().isEmpty()) {
                continue;
            }

            if (isEntryForSection(entry, targetSection, group)) {
                String sub = entry.getSubject().trim();
                uniqueSubjects.putIfAbsent(sub, sub);
            }
        }

        return new ArrayList<>(uniqueSubjects.values());
    }

    private boolean isEntryForSection(TimetableEntry entry, String targetSection, String group) {
        String sec = entry.getSection() != null ? entry.getSection().trim().toUpperCase() : "";
        if (sec.isEmpty()) {
            return false;
        }

        // 1. Exact match (e.g. "CY1" == "CY1")
        if (sec.equalsIgnoreCase(targetSection)) {
            return true;
        }

        // 2. Whole group shared entry (e.g. entry section is "CY" for a target like "CY1")
        if (!group.isEmpty() && sec.equalsIgnoreCase(group)) {
            return true;
        }

        // 3. Delimited compound sections (e.g. "CY1 + CY2", "CY1, CY2", "CY1 & CY2", "CY1/CY2")
        String[] tokens = sec.split("[/\\\\,+&|]|\\band\\b");
        for (String t : tokens) {
            String token = t.trim().toUpperCase();
            if (token.equalsIgnoreCase(targetSection)) {
                return true;
            }
        }

        return false;
    }

    private String normalizeStr(String val) {
        return val == null ? "" : val.trim().toLowerCase();
    }
}
