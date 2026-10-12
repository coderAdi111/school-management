package com.school.management.Service;

import com.school.management.Dao.TeacherDao;
import com.school.management.entity.TimetableEntry;
import com.school.management.entity.Teacher;

import jakarta.transaction.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class TeacherService {

    private final TeacherDao teacherDao;
    @PersistenceContext
    private EntityManager entityManager;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String normalizeCode(String code) {
        if (code == null) return null;
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private void updateTimetableFacultyValue(String oldValue, String newValue) {
        if (oldValue == null || oldValue.isBlank()) return;
        entityManager.createQuery(
                "UPDATE TimetableEntry t SET t.faculty = :newValue " +
                "WHERE LOWER(TRIM(t.faculty)) = LOWER(TRIM(:oldValue))"
        ).setParameter("oldValue", oldValue.trim())
         .setParameter("newValue", newValue == null ? "" : newValue.trim())
         .executeUpdate();
    }

    private void deleteTimetableRowsForFaculty(String facultyValue) {
        if (facultyValue == null || facultyValue.isBlank()) return;
        entityManager.createQuery(
                "DELETE FROM TimetableEntry t " +
                "WHERE LOWER(TRIM(t.faculty)) = LOWER(TRIM(:facultyValue))"
        ).setParameter("facultyValue", facultyValue.trim())
         .executeUpdate();
    }


    public TeacherService(TeacherDao teacherDao) {
        this.teacherDao = teacherDao;
    }

    // =========================
    // GET ALL TEACHERS
    // =========================

    @Transactional
    public List<Teacher> getAllTeachers() {
        List<Teacher> teachers = teacherDao.findAll();

        // Timetable entries are the source of truth for timetable-linked
        // teaching assignments. Reconcile on read so assignments left behind
        // by older CSV imports, scoped deletes, or overwrite imports disappear.
        // Existing academic IDs are retained for assignments that still match.
        List<TimetableEntry> timetableEntries = entityManager.createQuery(
                "SELECT t FROM TimetableEntry t ORDER BY t.id", TimetableEntry.class
        ).getResultList();

        for (Teacher teacher : teachers) {
            List<Map<String, Object>> oldAssignments = normalizeAssignments(
                    readAssignments(teacher.getTeachingAssignments())
            );
            Map<String, Map<String, Object>> oldByKey = new java.util.LinkedHashMap<>();
            for (Map<String, Object> old : oldAssignments) {
                oldByKey.putIfAbsent(assignmentKey(old), old);
            }

            List<Map<String, Object>> currentAssignments = new ArrayList<>();
            for (TimetableEntry entry : timetableEntries) {
                if (!entryMatchesTeacher(entry, teacher)) continue;
                Map<String, Object> current = new java.util.LinkedHashMap<>();
                current.put("departmentName", text(entry.getDepartment()));
                current.put("branchName", text(entry.getBranch()));
                current.put("branchCode", canonicalBranchCode(null, text(entry.getBranch())));
                current.put("semesterNumber", entry.getSemester());
                current.put("sectionName", text(entry.getSection()));
                current.put("subject", text(entry.getSubject()));

                String key = assignmentKey(current);
                Map<String, Object> previous = oldByKey.get(key);
                if (previous != null) {
                    current.put("departmentId", previous.get("departmentId"));
                    current.put("branchId", previous.get("branchId"));
                    current.put("semesterId", previous.get("semesterId"));
                    current.put("semesterName", previous.get("semesterName"));
                    current.put("sectionId", previous.get("sectionId"));
                }
                currentAssignments.add(current);
            }

            List<Map<String, Object>> cleaned = normalizeAssignments(currentAssignments);
            try {
                String cleanedJson = objectMapper.writeValueAsString(cleaned);
                if (!cleanedJson.equals(teacher.getTeachingAssignments())) {
                    teacher.setTeachingAssignments(cleanedJson);
                    teacherDao.save(teacher);
                }
            } catch (Exception e) {
                throw new IllegalStateException(
                        "Unable to reconcile teaching assignments for teacher " + teacher.getId(), e
                );
            }
        }

        return teachers;
    }

    private boolean entryMatchesTeacher(TimetableEntry entry, Teacher teacher) {
        String faculty = text(entry.getFaculty());
        if (faculty == null) return false;
        String code = normalizeCode(teacher.getFacultyCode());
        String fullName = ((teacher.getFirstName() == null ? "" : teacher.getFirstName()) + " " +
                (teacher.getLastName() == null ? "" : teacher.getLastName())).trim();
        if (code != null && faculty.equalsIgnoreCase(code)) return true;
        if (!fullName.isBlank() && faculty.equalsIgnoreCase(fullName)) return true;
        String initials = fullName.replaceAll("[^A-Za-z0-9 ]", " ").trim().replaceAll("\\s+", " ");
        if (!initials.isBlank()) {
            StringBuilder compact = new StringBuilder();
            for (String part : initials.split(" ")) if (!part.isBlank()) compact.append(part.charAt(0));
            if (compact.length() > 0 && faculty.replaceAll("[^A-Za-z0-9]", "").equalsIgnoreCase(compact.toString())) return true;
        }
        return false;
    }

    // =========================
    // GET TEACHER BY ID
    // =========================

    public Teacher getTeacherById(Long id) {

        return teacherDao.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Teacher not found with id: " + id
                        )
                );
    }

    // =========================
    // SEARCH TEACHERS
    // =========================

    public List<Teacher> searchTeachers(String name) {
        return teacherDao.findByName(name);
    }

    // =========================
    // CREATE / UPDATE
    // =========================

    @Transactional
    public Teacher syncFromTimetable(Map<String, Object> payload) {
        String faculty = text(payload.get("faculty"));
        String fullName = text(payload.get("fullName"));
        String department = text(payload.get("department"));
        String branch = text(payload.get("branch"));
        String branchCode = text(payload.get("branchCode"));
        String subject = text(payload.get("subject"));
        Integer semester = number(payload.get("semester"));
        Long departmentId = longNumber(payload.get("departmentId"));
        Long branchId = longNumber(payload.get("branchId"));
        Long semesterId = longNumber(payload.get("semesterId"));
        Long sectionId = longNumber(payload.get("sectionId"));
        String section = text(payload.get("section"));

        if (faculty == null || faculty.isBlank()) {
            throw new IllegalArgumentException("Faculty is required for timetable teacher sync.");
        }

        String code = faculty.trim().toUpperCase(Locale.ROOT);
        Teacher teacher = teacherDao.findByFacultyCode(code).orElse(null);

        if (teacher == null) {
            String normalizedName = fullName == null ? "" : fullName.trim().replaceAll("\\s+", " ");
            String first;
            String last;
            if (!normalizedName.isBlank()) {
                String[] parts = normalizedName.split(" ");
                first = parts[0];
                last = parts.length > 1 ? String.join(" ", java.util.Arrays.copyOfRange(parts, 1, parts.length)) : "Teacher";
            } else {
                // The official CSV contains only faculty codes (AB, BPS, ...).
                // Create the teacher immediately; the admin can fill the real name later.
                first = code;
                last = "Teacher";
            }
            teacher = new Teacher();
            teacher.setFirstName(first);
            teacher.setLastName(last);
            teacher.setFacultyCode(code);
            teacher.setStatus(Teacher.Status.ACTIVE);
        }

        if (teacher.getFacultyCode() == null || teacher.getFacultyCode().isBlank()) {
            teacher.setFacultyCode(code);
        }
        if (teacher.getStatus() != Teacher.Status.ACTIVE) teacher.setStatus(Teacher.Status.ACTIVE);

        if (subject != null && !subject.isBlank()) {
            List<Map<String, Object>> assignments = normalizeAssignments(
                    readAssignments(teacher.getTeachingAssignments())
            );
            boolean exists;
            // Match by the human-readable academic scope because timetable rows
            // do not carry academic entity IDs. Subject + scope + section is unique.
            String canonicalBranchCode = canonicalBranchCode(branchCode, branch);
            exists = assignments.stream().anyMatch(a ->
                same(a.get("departmentName"), department) &&
                same(
    canonicalBranchCode(
        a.get("branchCode") == null ? null : String.valueOf(a.get("branchCode")),
        a.get("branchName") == null ? null : String.valueOf(a.get("branchName"))
    ),
    canonicalBranchCode
) &&
                sameNumber(a.get("semesterNumber"), semester) &&
                same(a.get("sectionName"), section) &&
                same(a.get("subject"), subject)
            );
            if (!exists) {
                Map<String, Object> item = new java.util.LinkedHashMap<>();
                item.put("departmentId", departmentId);
                item.put("departmentName", department);
                item.put("branchId", branchId);
                item.put("branchName", branch);
                item.put("branchCode", canonicalBranchCode);
                item.put("semesterId", semesterId);
                item.put("semesterNumber", semester);
                item.put("sectionId", sectionId);
                item.put("sectionName", section);
                item.put("subject", subject.trim());
                assignments.add(item);
                try {
                    teacher.setTeachingAssignments(objectMapper.writeValueAsString(assignments));
                } catch (Exception e) {
                    throw new IllegalStateException("Unable to save teacher assignment.", e);
                }
            }

            // Clean old timetable assignment formats and remove duplicates.
            assignments = normalizeAssignments(assignments);
            try {
                teacher.setTeachingAssignments(
                        objectMapper.writeValueAsString(assignments)
                );
            } catch (Exception e) {
                throw new IllegalStateException("Unable to normalize teacher assignments.", e);
            }
        }

        if (teacher.getSubject() == null || teacher.getSubject().isBlank()) {
            teacher.setSubject(subject);
        }
        return teacherDao.save(teacher);
    }

    /**
     * Normalizes assignments saved by older versions of the timetable/teacher
     * sync code and removes duplicates. The UI uses branchCode when present,
     * so old records such as "Information Technology" without branchCode are
     * converted to IT.
     */
    private List<Map<String, Object>> normalizeAssignments(
            List<Map<String, Object>> input
    ) {
        List<Map<String, Object>> result = new ArrayList<>();

        for (Map<String, Object> raw : input) {
            if (raw == null) continue;

            Map<String, Object> a = new java.util.LinkedHashMap<>();

            String departmentName = text(raw.get("departmentName"));
            String branchName = text(raw.get("branchName"));
            String branchCode = canonicalBranchCode(
                    text(raw.get("branchCode")),
                    branchName
            );

            Integer semesterNumber = number(raw.get("semesterNumber"));
            if (semesterNumber == null) {
                semesterNumber = extractSemesterNumber(
                        text(raw.get("semesterName"))
                );
            }

            String semesterName = text(raw.get("semesterName"));
            if (semesterName == null && semesterNumber != null) {
                semesterName = semesterNumber + "th Semester";
            }

            String sectionName = text(raw.get("sectionName"));
            String subject = text(raw.get("subject"));

            if (departmentName == null || branchCode == null
                    || semesterNumber == null || sectionName == null
                    || subject == null) {
                continue;
            }

            a.put("departmentId", raw.get("departmentId"));
            a.put("departmentName", departmentName);
            a.put("branchId", raw.get("branchId"));
            a.put("branchName", branchName == null ? branchCode : branchName);
            a.put("branchCode", branchCode);
            a.put("semesterId", raw.get("semesterId"));
            a.put("semesterNumber", semesterNumber);
            a.put("semesterName", semesterName);
            a.put("sectionId", raw.get("sectionId"));
            a.put("sectionName", sectionName);
            a.put("subject", subject.trim());

            String key = assignmentKey(a);

            boolean duplicate = result.stream()
                    .anyMatch(existing -> assignmentKey(existing).equals(key));

            if (!duplicate) {
                result.add(a);
            }
        }

        return result;
    }

    private String assignmentKey(Map<String, Object> a) {
        return String.join("|",
                safeLower(a.get("departmentName")),
                safeLower(canonicalBranchCode(
                        text(a.get("branchCode")),
                        text(a.get("branchName"))
                )),
                String.valueOf(number(a.get("semesterNumber"))),
                safeLower(a.get("sectionName")),
                safeLower(a.get("subject"))
        );
    }

    private String safeLower(Object value) {
        return value == null
                ? ""
                : String.valueOf(value).trim().toLowerCase(Locale.ROOT);
    }

    private Integer extractSemesterNumber(String semesterName) {
        if (semesterName == null) return null;

        java.util.regex.Matcher matcher =
                java.util.regex.Pattern.compile("(\\d+)")
                        .matcher(semesterName);

        return matcher.find()
                ? Integer.valueOf(matcher.group(1))
                : null;
    }

    private String canonicalBranchCode(
            String code,
            String name
    ) {
        // The academic branch name is the reliable fallback when legacy
        // imports stored a display name (or an incorrect code) as branchCode.
        if (name != null && !name.isBlank()) {
            String normalizedName = name.trim().toLowerCase(Locale.ROOT);
            if (normalizedName.equals("cyber security") ||
                    normalizedName.equals("cybersecurity") ||
                    normalizedName.equals("cy")) return "CY";
        }

        if (code != null && !code.isBlank()) {
            String c = code.trim().toUpperCase(Locale.ROOT);

            if (c.equals("CYBER SECURITY") || c.equals("CYBERSECURITY")) return "CY";
            if (c.equals("INFORMATION TECHNOLOGY")) return "IT";
            if (c.equals("COMPUTER SCIENCE AND ENGINEERING")) return "CS";
            if (c.equals("COMPUTER SCIENCE")) return "CS";
            if (c.equals("ELECTRONICS AND COMMUNICATION ENGINEERING")) return "ECE";
            if (c.equals("MECHANICAL ENGINEERING")) return "ME";
            if (c.equals("CIVIL ENGINEERING")) return "CE";
            if (c.equals("ELECTRICAL ENGINEERING")) return "EE";

            return c;
        }

        if (name == null || name.isBlank()) return null;

        String n = name.trim().toLowerCase(Locale.ROOT);

        if (n.equals("cyber security") || n.equals("cybersecurity") || n.equals("cy")) return "CY";
        if (n.equals("information technology") || n.equals("it")) return "IT";
        if (n.equals("computer science") || n.equals("computer science and engineering") || n.equals("cse")) return "CS";
        if (n.equals("electronics and communication engineering") || n.equals("electronics and communication") || n.equals("ece")) return "ECE";
        if (n.equals("mechanical engineering") || n.equals("mechanical") || n.equals("me")) return "ME";
        if (n.equals("civil engineering") || n.equals("civil") || n.equals("ce")) return "CE";
        if (n.equals("electrical engineering") || n.equals("electrical") || n.equals("ee")) return "EE";

        return name.trim().toUpperCase(Locale.ROOT);
    }

    private List<Map<String, Object>> readAssignments(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception ignored) {
            return new ArrayList<>();
        }
    }

    private String text(Object value) {
        if (value == null) return null;
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    private Integer number(Object value) {
        if (value == null) return null;
        try { return Integer.valueOf(String.valueOf(value)); } catch (Exception ignored) { return null; }
    }

    private Long longNumber(Object value) {
        if (value == null) return null;
        try { return Long.valueOf(String.valueOf(value)); } catch (Exception ignored) { return null; }
    }

    private boolean same(Object a, Object b) {
        return a != null && b != null && String.valueOf(a).trim().equalsIgnoreCase(String.valueOf(b).trim());
    }

    private boolean sameNumber(Object a, Integer b) {
        Integer x = number(a);
        return x != null && b != null && x.equals(b);
    }

    private String codeFromNameOrFaculty(String name, String fallback) {
        String[] parts = name.trim().split("\\s+");
        if (parts.length >= 2) return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase(Locale.ROOT);
        return fallback;
    }

    @Transactional
    public Teacher saveTeacher(Teacher teacher) {
        normalizeTeacherAssignments(teacher);
        return teacherDao.save(teacher);
    }

    private void normalizeTeacherAssignments(Teacher teacher) {
        if (teacher == null) return;
        List<Map<String, Object>> assignments = normalizeAssignments(
                readAssignments(teacher.getTeachingAssignments())
        );
        try {
            teacher.setTeachingAssignments(objectMapper.writeValueAsString(assignments));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to normalize teacher assignments.", e);
        }
    }

    // =========================
    // UPDATE
    // =========================

    @Transactional
    public Teacher updateTeacher(Long id, Teacher updated) {
        Teacher existing = getTeacherById(id);

        // Capture old values BEFORE changing the entity. Otherwise old and new
        // names/codes become identical and timetable synchronization is skipped.
        String oldFacultyCode = normalizeCode(existing.getFacultyCode());
        String oldFullName = fullName(existing);
        List<Map<String, Object>> oldAssignments = normalizeAssignments(
                readAssignments(existing.getTeachingAssignments())
        );

        List<Map<String, Object>> newAssignments = updated.getTeachingAssignments() == null
                ? new ArrayList<>(oldAssignments)
                : normalizeAssignments(readAssignments(updated.getTeachingAssignments()));

        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setSubject(updated.getSubject());
        existing.setTeachingAssignments(writeAssignments(newAssignments));
        existing.setQualification(updated.getQualification());
        existing.setFacultyCode(normalizeCode(updated.getFacultyCode()));
        existing.setStatus(updated.getStatus());

        Teacher saved = teacherDao.save(existing);
        String newFacultyCode = normalizeCode(saved.getFacultyCode());
        String newFullName = fullName(saved);
        String newFacultyValue = newFacultyCode != null ? newFacultyCode : newFullName;

        // Update timetable rows that used the old exact code or exact full name.
        // Exact matching deliberately avoids changing combined/other faculty values.
        if (oldFacultyCode != null && !oldFacultyCode.equals(newFacultyCode)) {
            updateTimetableFacultyValue(oldFacultyCode, newFacultyValue);
        }
        if (!oldFullName.isBlank() && !oldFullName.equalsIgnoreCase(newFullName)
                && !oldFullName.equalsIgnoreCase(oldFacultyCode == null ? "" : oldFacultyCode)) {
            updateTimetableFacultyValue(oldFullName, newFacultyValue);
        }

        // Synchronize the teacher's edited assignment list with timetable rows.
        // Removed assignments have only their faculty cleared; the class row,
        // subject, time and room are preserved. New assignments claim only rows
        // with a blank faculty or this same teacher's old/new faculty value.
        for (Map<String, Object> oldAssignment : oldAssignments) {
            String key = assignmentKey(oldAssignment);
            boolean retained = newAssignments.stream().anyMatch(a -> assignmentKey(a).equals(key));
            if (!retained) {
                updateAssignmentRows(oldAssignment, newFacultyValue, null, oldFacultyCode,
                        newFullName, oldFullName, true);
            }
        }

        for (Map<String, Object> newAssignment : newAssignments) {
            String key = assignmentKey(newAssignment);
            boolean existed = oldAssignments.stream().anyMatch(a -> assignmentKey(a).equals(key));
            // Run for both old and new assignments: this also repairs rows that
            // were not synced correctly by an earlier edit.
            updateAssignmentRows(newAssignment, newFacultyValue, newFacultyValue,
                    oldFacultyCode, newFullName, oldFullName, false);
        }

        return saved;
    }

    private String fullName(Teacher teacher) {
        return ((teacher.getFirstName() == null ? "" : teacher.getFirstName()) + " " +
                (teacher.getLastName() == null ? "" : teacher.getLastName())).trim();
    }

    private String writeAssignments(List<Map<String, Object>> assignments) {
        try {
            return objectMapper.writeValueAsString(assignments);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to save teacher assignments.", e);
        }
    }

    private void updateAssignmentRows(Map<String, Object> assignment,
                                      String oldOrNewFacultyValue,
                                      String desiredFacultyValue,
                                      String oldFacultyCode,
                                      String newFullName,
                                      String oldFullName,
                                      boolean removeAssignment) {
        String department = text(assignment.get("departmentName"));
        String branch = text(assignment.get("branchName"));
        Integer semester = number(assignment.get("semesterNumber"));
        String section = text(assignment.get("sectionName"));
        String subject = text(assignment.get("subject"));
        if (department == null || branch == null || semester == null || section == null || subject == null) return;

        List<TimetableEntry> rows = entityManager.createQuery(
                "SELECT t FROM TimetableEntry t WHERE " +
                "LOWER(TRIM(t.department)) = LOWER(TRIM(:department)) AND t.semester = :semester AND " +
                "LOWER(TRIM(t.section)) = LOWER(TRIM(:section)) AND " +
                "LOWER(TRIM(t.subject)) = LOWER(TRIM(:subject))", TimetableEntry.class)
                .setParameter("department", department)
                .setParameter("semester", semester)
                .setParameter("section", section)
                .setParameter("subject", subject)
                .getResultList();

        String wantedBranchCode = canonicalBranchCode(
                text(assignment.get("branchCode")), branch);
        String currentCode = normalizeCode(oldFacultyCode);
        for (TimetableEntry row : rows) {
            String rowBranchCode = canonicalBranchCode(null, text(row.getBranch()));
            if (!same(rowBranchCode, wantedBranchCode)) continue;
            String faculty = text(row.getFaculty());
            boolean ownedByTeacher = faculty == null
                    || (currentCode != null && faculty.equalsIgnoreCase(currentCode))
                    || (!oldFullName.isBlank() && faculty.equalsIgnoreCase(oldFullName))
                    || (!newFullName.isBlank() && faculty.equalsIgnoreCase(newFullName))
                    || (oldOrNewFacultyValue != null && faculty != null && faculty.equalsIgnoreCase(oldOrNewFacultyValue));

            if (removeAssignment) {
                // Clear only rows currently assigned to this teacher.
                if (faculty != null && ownedByTeacher) row.setFaculty(null);
            } else if (ownedByTeacher && desiredFacultyValue != null && !desiredFacultyValue.isBlank()) {
                row.setFaculty(desiredFacultyValue);
            }
        }
        entityManager.flush();
    }

    // =========================
    // DELETE
    // =========================

    @Transactional
    public void deleteTeacher(Long id) {
        Teacher existing = getTeacherById(id);
        String code = normalizeCode(existing.getFacultyCode());
        String fullName = ((existing.getFirstName() == null ? "" : existing.getFirstName()) + " " +
                (existing.getLastName() == null ? "" : existing.getLastName())).trim();

        // Remove classroom references first, then permanently delete timetable rows
        // assigned exactly to this teacher. Do not touch students, attendance, marks,
        // fees, other teachers, or timetable rows assigned to a different faculty.
        entityManager.createQuery(
                "UPDATE ClassRoom c SET c.teacher = null WHERE c.teacher.id = :teacherId"
        ).setParameter("teacherId", id).executeUpdate();

        deleteTimetableRowsForFaculty(code);
        if (!fullName.isBlank() && (code == null || !fullName.equalsIgnoreCase(code))) {
            deleteTimetableRowsForFaculty(fullName);
        }

        teacherDao.delete(id);
    }
}