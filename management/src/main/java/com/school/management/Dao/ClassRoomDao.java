package com.school.management.Dao;

import com.school.management.entity.ClassRoom;
import java.util.List;
import java.util.Optional;

public interface ClassRoomDao {
List<ClassRoom>     findAll();
Optional<ClassRoom> findById(Long id);
List<ClassRoom>     findByGrade(String grade);
ClassRoom           save(ClassRoom classRoom);
void                delete(Long id);
}
