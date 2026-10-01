package com.school.management.Controller;

import com.school.management.Service.ClassRoomService;
import com.school.management.entity.ClassRoom;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")

public class ClassRoomController {

    private final ClassRoomService classRoomService;

    public ClassRoomController(ClassRoomService classRoomService) {
        this.classRoomService = classRoomService;
    }

    @GetMapping
    public List<ClassRoom> getAllClasses() {
        return classRoomService.getAllClassRooms();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClassRoom> getClassById(@PathVariable Long id) {
        return ResponseEntity.ok(
                classRoomService.getClassRoomById(id)
        );
    }

    @PostMapping
    public ResponseEntity<ClassRoom> createClass(
            @RequestBody ClassRoom classRoom) {

        ClassRoom created = classRoomService.createClassRoom(classRoom);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClassRoom> updateClass(
            @PathVariable Long id,
            @RequestBody ClassRoom classRoom) {

        return ResponseEntity.ok(
                classRoomService.updateClassRoom(id, classRoom)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClass(@PathVariable Long id) {

        classRoomService.deleteClassRoom(id);

        return ResponseEntity.noContent().build();
    }
}