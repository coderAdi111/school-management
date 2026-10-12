package com.school.management;

import com.school.management.Dao.TimetableDao;
import com.school.management.Service.TimetableService;
import com.school.management.entity.TimetableEntry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class TimetableServiceTest {

    @Autowired
    private TimetableService timetableService;

    @Autowired
    private TimetableDao timetableDao;

    private TimetableEntry createSampleEntry(String section, String day, String start, String end, String subject, String faculty, String room) {
        TimetableEntry e = new TimetableEntry();
        e.setDepartment("Computer Science And Engineering");
        e.setBranch("IT");
        e.setSemester(5);
        e.setSection(section);
        e.setDayOfWeek(day);
        e.setStartTime(start);
        e.setEndTime(end);
        e.setSubject(subject);
        e.setFaculty(faculty);
        e.setRoom(room);
        e.setPractical(false);
        return e;
    }

    @Test
    void testValidateAndNormalize_MissingDepartment_ThrowsException() {
        TimetableEntry e = createSampleEntry("TEST1", "Monday", "09:00", "10:00", "Math", "F1", "R1");
        e.setDepartment(null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                timetableService.validateAndNormalize(e, 1));
        assertTrue(ex.getMessage().contains("Department is required"));
    }

    @Test
    void testValidateAndNormalize_MissingBranch_ThrowsException() {
        TimetableEntry e = createSampleEntry("TEST1", "Monday", "09:00", "10:00", "Math", "F1", "R1");
        e.setBranch("");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                timetableService.validateAndNormalize(e, 1));
        assertTrue(ex.getMessage().contains("Branch is required"));
    }

    @Test
    void testValidateAndNormalize_InvalidSemester_ThrowsException() {
        TimetableEntry e = createSampleEntry("TEST1", "Monday", "09:00", "10:00", "Math", "F1", "R1");
        e.setSemester(null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                timetableService.validateAndNormalize(e, 1));
        assertTrue(ex.getMessage().contains("Valid semester (1-12) is required"));

        e.setSemester(0);
        assertThrows(IllegalArgumentException.class, () -> timetableService.validateAndNormalize(e, 1));
    }

    @Test
    void testValidateAndNormalize_InvalidTimes_ThrowsException() {
        TimetableEntry e = createSampleEntry("TEST1", "Monday", "10:00", "09:00", "Math", "F1", "R1");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                timetableService.validateAndNormalize(e, 1));
        assertTrue(ex.getMessage().contains("Start time (10:00) must be earlier than end time (09:00)"));
    }

    @Test
    void testBulkUpsert_DuplicateImport_PreventsDuplicates() {
        String testSection = "TEST_DUP";
        TimetableEntry entry1 = createSampleEntry(testSection, "Monday", "09:00", "10:00", "Math", "Dr. A", "101");
        TimetableEntry entry2 = createSampleEntry(testSection, "Monday", "10:00", "11:00", "Physics", "Dr. B", "102");

        // First import
        List<TimetableEntry> firstBatch = timetableService.bulkUpsert(List.of(entry1, entry2), "merge");
        assertEquals(2, firstBatch.size());
        Long id1 = firstBatch.get(0).getId();
        Long id2 = firstBatch.get(1).getId();
        assertNotNull(id1);
        assertNotNull(id2);

        // Second import of the exact same records
        TimetableEntry entry1Clone = createSampleEntry(testSection, "Monday", "09:00", "10:00", "Math", "Dr. A", "101");
        TimetableEntry entry2Clone = createSampleEntry(testSection, "Monday", "10:00", "11:00", "Physics", "Dr. B", "102");
        List<TimetableEntry> secondBatch = timetableService.bulkUpsert(List.of(entry1Clone, entry2Clone), "merge");

        assertEquals(2, secondBatch.size());
        // Verify IDs are reused and not duplicated
        assertEquals(id1, secondBatch.get(0).getId());
        assertEquals(id2, secondBatch.get(1).getId());

        List<TimetableEntry> fromDb = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                "Computer Science And Engineering", "IT", 5, testSection);
        assertEquals(2, fromDb.size(), "Database must contain exactly 2 records, zero duplicates created");
    }

    @Test
    void testBulkUpsert_BatchWithInternalDuplicates_DeduplicatesBeforeSaving() {
        String testSection = "TEST_IDUP";
        TimetableEntry e1 = createSampleEntry(testSection, "Tuesday", "10:00", "11:00", "CN", "Dr. A", "201");
        TimetableEntry e1Clone = createSampleEntry(testSection, "Tuesday", "10:00", "11:00", "CN", "Dr. A", "201");

        // The input list contains internal duplicate of the same slot
        List<TimetableEntry> saved = timetableService.bulkUpsert(List.of(e1, e1Clone), "merge");
        assertEquals(1, saved.size(), "Internal duplicates within imported batch must be deduplicated to 1 record");

        List<TimetableEntry> fromDb = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                "Computer Science And Engineering", "IT", 5, testSection);
        assertEquals(1, fromDb.size());
    }

    @Test
    void testBulkUpsert_ParallelLabEntries_PreservedIndependently() {
        String testSection = "TEST_LAB";
        // Two parallel lab sessions in the exact same time slot for the same section
        TimetableEntry lab1 = createSampleEntry(testSection, "Thursday", "15:00", "17:00", "LAB", "AB", "Lab A");
        lab1.setPractical(true);
        TimetableEntry lab2 = createSampleEntry(testSection, "Thursday", "15:00", "17:00", "LAB", "MS", "G 18 B");
        lab2.setPractical(true);

        List<TimetableEntry> savedFirst = timetableService.bulkUpsert(List.of(lab1, lab2), "merge");
        assertEquals(2, savedFirst.size());
        Long lab1Id = savedFirst.get(0).getId();
        Long lab2Id = savedFirst.get(1).getId();
        assertNotEquals(lab1Id, lab2Id);

        // Re-importing parallel labs should preserve both distinct IDs
        TimetableEntry lab1Repeat = createSampleEntry(testSection, "Thursday", "15:00", "17:00", "LAB", "AB", "Lab A");
        lab1Repeat.setPractical(true);
        TimetableEntry lab2Repeat = createSampleEntry(testSection, "Thursday", "15:00", "17:00", "LAB", "MS", "G 18 B");
        lab2Repeat.setPractical(true);

        List<TimetableEntry> savedSecond = timetableService.bulkUpsert(List.of(lab1Repeat, lab2Repeat), "merge");
        assertEquals(2, savedSecond.size());
        assertEquals(lab1Id, savedSecond.get(0).getId());
        assertEquals(lab2Id, savedSecond.get(1).getId());

        List<TimetableEntry> fromDb = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                "Computer Science And Engineering", "IT", 5, testSection);
        assertEquals(2, fromDb.size(), "Both parallel lab entries must be preserved without duplication");
    }

    @Test
    void testBulkUpsert_DifferentSubjectInSameSlot_DoesNotOverwriteExistingSubject() {
        String testSection = "TEST_DIFF";
        TimetableEntry originalClass = createSampleEntry(testSection, "Monday", "09:00", "10:00", "COA", "SNT", "101");
        List<TimetableEntry> firstBatch = timetableService.bulkUpsert(List.of(originalClass), "merge");
        assertEquals(1, firstBatch.size());
        Long originalId = firstBatch.get(0).getId();

        // New import has a different subject in the same time slot
        TimetableEntry differentSubjectClass = createSampleEntry(testSection, "Monday", "09:00", "10:00", "DBMS", "KPS", "102");
        List<TimetableEntry> secondBatch = timetableService.bulkUpsert(List.of(differentSubjectClass), "merge");
        assertEquals(1, secondBatch.size());
        Long newId = secondBatch.get(0).getId();
        assertNotEquals(originalId, newId, "New subject must get a new ID, not overwrite existing subject");

        List<TimetableEntry> fromDb = timetableDao.findByDepartmentIgnoreCaseAndBranchIgnoreCaseAndSemesterAndSectionIgnoreCaseOrderByDayOfWeekAscStartTimeAsc(
                "Computer Science And Engineering", "IT", 5, testSection);
        assertEquals(2, fromDb.size(), "Both COA and DBMS must exist; existing subject must not be overwritten");
        assertTrue(fromDb.stream().anyMatch(e -> "COA".equals(e.getSubject())));
        assertTrue(fromDb.stream().anyMatch(e -> "DBMS".equals(e.getSubject())));
    }

    @Test
    void testCreateWithDuplicateProtection_ReturnsExistingWithoutDuplicating() {
        String testSection = "TEST_SGL";
        TimetableEntry e1 = createSampleEntry(testSection, "Monday", "09:00", "10:00", "Math", "Dr. A", "101");
        TimetableEntry saved1 = timetableService.createWithDuplicateProtection(e1);
        assertNotNull(saved1.getId());

        TimetableEntry e2 = createSampleEntry(testSection, "Monday", "09:00", "10:00", "Math", "Dr. A", "101");
        TimetableEntry saved2 = timetableService.createWithDuplicateProtection(e2);

        assertEquals(saved1.getId(), saved2.getId(), "Exact clone must return existing ID");
    }

    @Test
    void testGetSubjectsForSection_FiltersAndIncludesCombinedSectionsAndLabs() {
        String dept = "Computer Science And Engineering";
        String branch = "CY";
        int sem = 5;

        // CY1 specific theory class
        TimetableEntry cy1Theory = new TimetableEntry(dept, null, branch, sem, "CY1", "CY", "Monday", "Cyber Forensics", "Dr. A", "101", "09:00", "10:00", false);
        // CY1 practical lab
        TimetableEntry cy1Lab = new TimetableEntry(dept, null, branch, sem, "CY1", "CY", "Tuesday", "Cyber Security Lab", "Dr. B", "Lab 1", "14:00", "16:00", true);
        // CY1 + CY2 combined class
        TimetableEntry combined = new TimetableEntry(dept, null, branch, sem, "CY1 + CY2", "CY", "Wednesday", "Compiler Design", "Prof. C", "Auditorium", "10:00", "11:00", false);
        // Whole group CY class
        TimetableEntry groupClass = new TimetableEntry(dept, null, branch, sem, "CY", "CY", "Thursday", "Information Security", "Dr. D", "201", "11:00", "12:00", false);
        // Duplicate occurrence of Cyber Forensics on Friday
        TimetableEntry cy1TheoryRepeat = new TimetableEntry(dept, null, branch, sem, "CY1", "CY", "Friday", "Cyber Forensics", "Dr. A", "101", "09:00", "10:00", false);

        // Exclusive to CY2 (must NOT appear in CY1)
        TimetableEntry cy2Exclusive = new TimetableEntry(dept, null, branch, sem, "CY2", "CY", "Tuesday", "Malware Analysis Lab", "Dr. E", "Lab 2", "14:00", "16:00", true);
        // Different branch IT (must NOT appear in CY)
        TimetableEntry itClass = new TimetableEntry(dept, null, "IT", sem, "I1", "I", "Monday", "Cloud Computing", "Dr. F", "301", "09:00", "10:00", false);
        // Different semester (must NOT appear in sem 5)
        TimetableEntry sem3Class = new TimetableEntry(dept, null, branch, 3, "CY1", "CY", "Monday", "Data Structures", "Dr. G", "102", "09:00", "10:00", false);

        timetableDao.saveAll(List.of(cy1Theory, cy1Lab, combined, groupClass, cy1TheoryRepeat, cy2Exclusive, itClass, sem3Class));

        // 1. Query for CY1
        List<String> cy1Subjects = timetableService.getSubjectsForSection(dept, branch, sem, "CY1");

        // Asserts: CY1 has theory, lab, combined class, and group class
        assertTrue(cy1Subjects.contains("Cyber Forensics"), "CY1 must include Cyber Forensics");
        assertTrue(cy1Subjects.contains("Cyber Security Lab"), "CY1 must include practical Cyber Security Lab");
        assertTrue(cy1Subjects.contains("Compiler Design"), "CY1 must include combined CY1 + CY2 Compiler Design");
        assertTrue(cy1Subjects.contains("Information Security"), "CY1 must include group CY Information Security");

        // Asserts: De-duplication test
        long cyberForensicsCount = cy1Subjects.stream().filter("Cyber Forensics"::equals).count();
        assertEquals(1, cyberForensicsCount, "Repeated weekly subject must be de-duplicated to appear exactly once");

        // Asserts: Exclusive CY2 lab, different branch, and different semester must NOT be included
        assertFalse(cy1Subjects.contains("Malware Analysis Lab"), "CY1 must NOT include CY2 exclusive Malware Analysis Lab");
        assertFalse(cy1Subjects.contains("Cloud Computing"), "CY1 must NOT include IT branch Cloud Computing");
        assertFalse(cy1Subjects.contains("Data Structures"), "CY1 must NOT include 3rd semester Data Structures");

        // 2. Query for CY2 (Section change test)
        List<String> cy2Subjects = timetableService.getSubjectsForSection(dept, branch, sem, "CY2");

        assertTrue(cy2Subjects.contains("Malware Analysis Lab"), "CY2 must include its exclusive Malware Analysis Lab");
        assertTrue(cy2Subjects.contains("Compiler Design"), "CY2 must include combined CY1 + CY2 Compiler Design");
        assertTrue(cy2Subjects.contains("Information Security"), "CY2 must include group CY Information Security");
        assertFalse(cy2Subjects.contains("Cyber Security Lab"), "CY2 must NOT include CY1 exclusive Cyber Security Lab");
    }
}
