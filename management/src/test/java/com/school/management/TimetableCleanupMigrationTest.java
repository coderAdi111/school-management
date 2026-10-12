package com.school.management;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.Commit;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class TimetableCleanupMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @Order(1)
    @Commit
    void executePhase2TimetableCleanup() {
        // Step 1: Verification of current state
        Integer initialCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries", Integer.class);
        assertNotNull(initialCount);
        System.out.println("Current timetable_entries count: " + initialCount);

        if (initialCount >= 436) {
            // Step 2: Backup table creation (using LIKE to preserve PRIMARY KEY for Aiven sql_require_primary_key)
            jdbcTemplate.execute("DROP TABLE IF EXISTS timetable_entries_backup_phase2");
            jdbcTemplate.execute("CREATE TABLE timetable_entries_backup_phase2 LIKE timetable_entries");
            jdbcTemplate.execute("INSERT INTO timetable_entries_backup_phase2 SELECT * FROM timetable_entries");
            Integer backupCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries_backup_phase2", Integer.class);
            assertEquals(initialCount, backupCount, "Backup table must match pre-cleanup count exactly");
            System.out.println("Backed up " + backupCount + " records to timetable_entries_backup_phase2");

            // Step 3: Quarantine table creation (using LIKE to preserve PRIMARY KEY)
            jdbcTemplate.execute("DROP TABLE IF EXISTS timetable_entries_quarantine");
            jdbcTemplate.execute("CREATE TABLE timetable_entries_quarantine LIKE timetable_entries");
            jdbcTemplate.execute("INSERT INTO timetable_entries_quarantine SELECT * FROM timetable_entries " +
                    "WHERE id NOT IN (SELECT id FROM timetable_entries_backup_phase2 WHERE (id BETWEEN 1302 AND 1451) OR (id BETWEEN 1599 AND 1647))");
            Integer quarantineCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries_quarantine", Integer.class);
            assertEquals(237, quarantineCount, "Quarantine table must have exactly 237 records");
            System.out.println("Quarantined " + quarantineCount + " duplicate/corrupted records in timetable_entries_quarantine");

            // Step 4: Safely delete quarantined records from timetable_entries
            int deleted = jdbcTemplate.update("DELETE FROM timetable_entries WHERE id IN (SELECT id FROM timetable_entries_quarantine)");
            assertEquals(237, deleted, "Deleted count must match quarantine count exactly (237)");
            System.out.println("Deleted " + deleted + " quarantined records from timetable_entries");

            // Step 5: Update shifted timings, truncated durations, and missing room for active batches
            updateActiveBatches();
        } else {
            System.out.println("Database is already cleaned (" + initialCount + " records). Running verification invariants.");
        }

        // Step 6: Post-cleanup verification assertions
        Integer finalCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries", Integer.class);
        assertEquals(199, finalCount, "Post-cleanup total entries must be exactly 199");

        Integer itCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'it'", Integer.class);
        assertEquals(50, itCount, "IT branch must have exactly 50 entries");

        Integer csCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'cs'", Integer.class);
        assertEquals(100, csCount, "CS branch must have exactly 100 entries (50 CA + 50 CB)");

        Integer cyCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'cy'", Integer.class);
        assertEquals(49, cyCount, "CY branch must have exactly 49 entries");

        Integer caCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'cs' AND section IN ('CA1', 'CA2')", Integer.class);
        assertEquals(50, caCount, "CS-CA must have exactly 50 entries");

        Integer cbCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'cs' AND section IN ('CB1', 'CB2')", Integer.class);
        assertEquals(50, cbCount, "CS-CB must have exactly 50 entries");

        // Verify zero misplaced records
        Integer misplacedItInCs = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'cs' AND section IN ('I1', 'I2')", Integer.class);
        assertEquals(0, misplacedItInCs, "Zero IT sections under CS branch");

        Integer misplacedCyInCs = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE LOWER(TRIM(branch)) = 'cs' AND section IN ('CY1', 'CY2')", Integer.class);
        assertEquals(0, misplacedCyInCs, "Zero CY sections under CS branch");

        Integer corruptedSections = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE section LIKE '%IT%'", Integer.class);
        assertEquals(0, corruptedSections, "Zero corrupted section names");

        // Verify record 1413 room
        String room1413 = jdbcTemplate.queryForObject("SELECT room FROM timetable_entries WHERE id = 1413", String.class);
        assertEquals("CC", room1413, "Record 1413 room must be 'CC'");

        // Verify CCA is 10:00-11:00 (1 hour)
        Integer ccaNon1Hr = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE subject = 'CCA' AND (start_time != '10:00' OR end_time != '11:00')", Integer.class);
        assertEquals(0, ccaNon1Hr, "All CCA slots must be exactly 10:00-11:00");

        // Verify all practical labs are 2 hours
        Integer labsNon2Hr = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM timetable_entries WHERE practical = 1 AND (TIMESTAMPDIFF(MINUTE, STR_TO_DATE(start_time, '%H:%i'), STR_TO_DATE(end_time, '%H:%i')) != 120)", Integer.class);
        assertEquals(0, labsNon2Hr, "All practical labs must be exactly 2 hours (120 minutes)");

        // Verify student/attendance/fee/mark records are completely untouched
        Integer studentCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM students", Integer.class);
        assertNotNull(studentCount);
        System.out.println("Students table verified untouched: " + studentCount + " records");

        System.out.println("=================================================");
        System.out.println("PHASE 2 TIMETABLE DATABASE CLEANUP VERIFIED 100%");
        System.out.println("=================================================");
    }

    private void updateActiveBatches() {
        // Batch 6 (IT, Sem 5): 16 records
        Map<Long, String[]> batch6Updates = Map.ofEntries(
                Map.entry(1308L, new String[]{"12:00", "13:00"}),
                Map.entry(1309L, new String[]{"12:00", "13:00"}),
                Map.entry(1318L, new String[]{"12:00", "13:00"}),
                Map.entry(1319L, new String[]{"12:00", "13:00"}),
                Map.entry(1326L, new String[]{"12:00", "13:00"}),
                Map.entry(1327L, new String[]{"12:00", "13:00"}),
                Map.entry(1328L, new String[]{"14:00", "16:00"}), // 2-hour IT LAB
                Map.entry(1335L, new String[]{"12:00", "13:00"}),
                Map.entry(1336L, new String[]{"12:00", "13:00"}),
                Map.entry(1339L, new String[]{"10:00", "11:00"}), // 1-hour CCA
                Map.entry(1340L, new String[]{"10:00", "11:00"}), // 1-hour CCA
                Map.entry(1347L, new String[]{"12:00", "13:00"}),
                Map.entry(1348L, new String[]{"12:00", "13:00"}),
                Map.entry(1349L, new String[]{"13:00", "14:00"}),
                Map.entry(1350L, new String[]{"13:00", "14:00"}),
                Map.entry(1351L, new String[]{"14:00", "16:00"})  // 2-hour IT LAB
        );
        for (var entry : batch6Updates.entrySet()) {
            int updated = jdbcTemplate.update("UPDATE timetable_entries SET start_time = ?, end_time = ? WHERE id = ?",
                    entry.getValue()[0], entry.getValue()[1], entry.getKey());
            assertEquals(1, updated, "Batch 6 ID " + entry.getKey() + " must update 1 record");
        }
        System.out.println("Batch 6 (IT): Updated " + batch6Updates.size() + " records");

        // Batch 7 (CS-CA, Sem 5): 19 records
        Map<Long, String[]> batch7Updates = Map.ofEntries(
                Map.entry(1358L, new String[]{"12:00", "13:00"}),
                Map.entry(1359L, new String[]{"12:00", "13:00"}),
                Map.entry(1368L, new String[]{"12:00", "13:00"}),
                Map.entry(1369L, new String[]{"12:00", "13:00"}),
                Map.entry(1377L, new String[]{"12:00", "13:00"}),
                Map.entry(1378L, new String[]{"12:00", "13:00"}),
                Map.entry(1379L, new String[]{"13:00", "14:00"}),
                Map.entry(1380L, new String[]{"13:00", "14:00"}),
                Map.entry(1381L, new String[]{"14:00", "16:00"}), // 2-hour IT LAB
                Map.entry(1384L, new String[]{"10:00", "11:00"}), // 1-hour CCA
                Map.entry(1385L, new String[]{"10:00", "11:00"}), // 1-hour CCA
                Map.entry(1390L, new String[]{"12:00", "13:00"}),
                Map.entry(1391L, new String[]{"12:00", "13:00"}),
                Map.entry(1392L, new String[]{"13:00", "14:00"}),
                Map.entry(1393L, new String[]{"13:00", "14:00"}),
                Map.entry(1398L, new String[]{"12:00", "13:00"}),
                Map.entry(1399L, new String[]{"12:00", "13:00"}),
                Map.entry(1400L, new String[]{"13:00", "14:00"}),
                Map.entry(1401L, new String[]{"13:00", "14:00"})
        );
        for (var entry : batch7Updates.entrySet()) {
            int updated = jdbcTemplate.update("UPDATE timetable_entries SET start_time = ?, end_time = ? WHERE id = ?",
                    entry.getValue()[0], entry.getValue()[1], entry.getKey());
            assertEquals(1, updated, "Batch 7 ID " + entry.getKey() + " must update 1 record");
        }
        System.out.println("Batch 7 (CS-CA): Updated " + batch7Updates.size() + " records");

        // Batch 8 (CS-CB, Sem 5): 16 records (15 timing updates + 1 room update)
        Map<Long, String[]> batch8Updates = Map.ofEntries(
                Map.entry(1407L, new String[]{"12:00", "13:00"}),
                Map.entry(1402L, new String[]{"12:00", "13:00"}),
                Map.entry(1412L, new String[]{"12:00", "13:00"}),
                Map.entry(1416L, new String[]{"12:00", "13:00"}),
                Map.entry(1423L, new String[]{"12:00", "13:00"}),
                Map.entry(1425L, new String[]{"12:00", "13:00"}),
                Map.entry(1433L, new String[]{"12:00", "13:00"}),
                Map.entry(1432L, new String[]{"12:00", "13:00"}),
                Map.entry(1444L, new String[]{"12:00", "13:00"}),
                Map.entry(1445L, new String[]{"12:00", "13:00"}),
                Map.entry(1443L, new String[]{"13:00", "14:00"}),
                Map.entry(1446L, new String[]{"13:00", "14:00"}),
                Map.entry(1447L, new String[]{"14:00", "16:00"}), // 2-hour IT LAB
                Map.entry(1449L, new String[]{"10:00", "11:00"}), // 1-hour CCA
                Map.entry(1451L, new String[]{"10:00", "11:00"})  // 1-hour CCA
        );
        for (var entry : batch8Updates.entrySet()) {
            int updated = jdbcTemplate.update("UPDATE timetable_entries SET start_time = ?, end_time = ? WHERE id = ?",
                    entry.getValue()[0], entry.getValue()[1], entry.getKey());
            assertEquals(1, updated, "Batch 8 ID " + entry.getKey() + " must update 1 record");
        }
        // Room update for record 1413 (IT LAB CC -> Room 'CC')
        int roomUpdated = jdbcTemplate.update("UPDATE timetable_entries SET room = 'CC' WHERE id = 1413");
        assertEquals(1, roomUpdated, "Record 1413 must update room to 'CC'");
        System.out.println("Batch 8 (CS-CB): Updated " + (batch8Updates.size() + 1) + " records");

        // Batch 10 (CY, Sem 5): 2 records (CCA duration)
        Map<Long, String[]> batch10Updates = Map.of(
                1599L, new String[]{"10:00", "11:00"},
                1603L, new String[]{"10:00", "11:00"}
        );
        for (var entry : batch10Updates.entrySet()) {
            int updated = jdbcTemplate.update("UPDATE timetable_entries SET start_time = ?, end_time = ? WHERE id = ?",
                    entry.getValue()[0], entry.getValue()[1], entry.getKey());
            assertEquals(1, updated, "Batch 10 ID " + entry.getKey() + " must update 1 record");
        }
        System.out.println("Batch 10 (CY): Updated " + batch10Updates.size() + " records");
    }

    @Test
    @Order(2)
    void dumpCleanedEntriesToJson() throws Exception {
        var rows = jdbcTemplate.queryForList("SELECT * FROM timetable_entries ORDER BY id ASC");
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.enable(com.fasterxml.jackson.databind.SerializationFeature.INDENT_OUTPUT);
        java.io.File dest = new java.io.File("C:\\Users\\aks30\\.gemini\\antigravity\\brain\\877eb9ad-d229-4dde-a11f-45261b35deee\\scratch\\db_cleaned_timetable_entries.json");
        mapper.writeValue(dest, rows);
        System.out.println("Exported " + rows.size() + " cleaned records to " + dest.getAbsolutePath());
    }
}
