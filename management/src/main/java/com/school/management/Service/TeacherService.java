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

    private void updateTimetableFacultyCode(String oldCode, String newCode) {
        var query = entityManager.createQuery(
                "UPDATE TimetableEntry t SET t.faculty = :newCode " +
                "WHERE LOWER(TRIM(t.faculty)) = LOWER(TRIM(:oldCode))"
        );
        query.setParameter("oldCode", oldCode);
        query.setParameter("newCode", newCode == null ? "" : newCode);
        query.executeUpdate();
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

        // One-time cleanup for assignments created by older sync versions.
        // This runs when the Teachers page loads, so existing teachers are
        // cleaned without requiring another timetable upload.
        for (Teacher teacher : teachers) {
            List<Map<String, Object>> cleaned = normalizeAssignments(
                    readAssignments(teacher.getTeachingAssignments())
            );

            try {
                String cleanedJson = objectMapper.writeValueAsString(cleaned);
                if (!cleanedJson.equals(teacher.getTeachingAssignments())) {
                    teacher.setTeachingAssignments(cleanedJson);
                    teacherDao.save(teacher);
                }
            } catch (Exception e) {
                throw new IllegalStateException(
                        "Unable to clean teaching assignments for teacher " + teacher.getId(),
                        e
                );
            }
        }

        return teachers;
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
            teacher.setFacultyCode(codeFromNameOrFaculty(normalizedName, code));
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
        if (code != null && !code.isBlank()) {
            String c = code.trim().toUpperCase(Locale.ROOT);

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

    public Teacher saveTeacher(Teacher teacher) {
        return teacherDao.save(teacher);
    }

    // =========================
    // UPDATE
    // =========================

    @Transactional
    public Teacher updateTeacher(
            Long id,
            Teacher updated
    ) {

        Teacher existing =
                getTeacherById(id);

        existing.setFirstName(
                updated.getFirstName()
        );

        existing.setLastName(
                updated.getLastName()
        );

        existing.setEmail(
                updated.getEmail()
        );

        existing.setPhone(
                updated.getPhone()
        );

        String oldFacultyCode = normalizeCode(existing.getFacultyCode());

        existing.setSubject(
                updated.getSubject()
        );

        // Keep all department/branch/semester/section/subject assignments
        // when a teacher is updated/imported again.
        existing.setTeachingAssignments(
                updated.getTeachingAssignments()
        );

        existing.setQualification(
                updated.getQualification()
        );

        existing.setFacultyCode(
                normalizeCode(updated.getFacultyCode())
        );

        existing.setStatus(
                updated.getStatus()
        );

        Teacher saved = teacherDao.save(existing);

        // Timetable entries store the faculty code (AB, BPS, RR, ...).
        // When a teacher's code is edited, keep the Weekly Timetable linked
        // to the same teacher by replacing the old code in I1/I2 entries.
        String newFacultyCode = normalizeCode(saved.getFacultyCode());
        if (oldFacultyCode != null && !oldFacultyCode.equals(newFacultyCode)) {
            updateTimetableFacultyCode(oldFacultyCode, newFacultyCode);
        }

        return saved;
    }

    // =========================
    // DELETE
    // =========================

    @Transactional
    public void deleteTeacher(Long id) {

        Teacher existing = getTeacherById(id);
        existing.setStatus(Teacher.Status.INACTIVE);
        teacherDao.save(existing);
    }
}