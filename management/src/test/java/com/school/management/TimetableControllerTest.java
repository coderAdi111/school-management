package com.school.management;

import com.school.management.Controller.TimetableController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class TimetableControllerTest {

    @Autowired
    private TimetableController timetableController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(timetableController).build();
    }

    @Test
    void testGetSubjects_ReturnsFilteredSubjects() {
        List<String> subjects = timetableController.getSubjects("Computer Science And Engineering", "CY", 5, "CY1");
        assertNotNull(subjects);
        assertTrue(subjects.contains("CN"));
        assertTrue(subjects.contains("COA"));
        assertTrue(subjects.contains("IDS"));
    }

    @Test
    void testGetSubjects_NullParameters_ReturnsEmptyListSafely() {
        List<String> subjects = timetableController.getSubjects(null, null, null, null);
        assertNotNull(subjects);
        assertTrue(subjects.isEmpty());
    }

    @Test
    void testGetSubjectsHttpEndpoint_ReturnsSubjectsForCY1() throws Exception {
        mockMvc.perform(get("/api/timetable/subjects")
                .param("department", "Computer Science And Engineering")
                .param("branch", "CY")
                .param("semester", "5")
                .param("section", "CY1"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(13))
                .andExpect(jsonPath("$[0]").value("CCA"))
                .andExpect(jsonPath("$[1]").value("CN"));
    }
}
