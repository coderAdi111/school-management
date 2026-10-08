package com.school.management.Service;

import com.school.management.Dao.StudentDao;
import com.school.management.entity.Student;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class StudentService {

    private final StudentDao studentDao;

    public StudentService(StudentDao studentDao) {
        this.studentDao = studentDao;
    }

    public List<Student> getAllStudents() {

        return studentDao.findAll();
    }

    public Student getStudentById(Long id) {

        return studentDao.findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Student not found: " + id
                        )
                );
    }

    public List<Student> searchStudents(String name) {

        return studentDao.searchByName(name);
    }

    public List<Student> getStudentsByClass(Long classId) {

        return studentDao.findByClassRoomId(classId);
    }

    @Transactional
    public Student createStudent(Student student) {

        Optional<Student> existing =
                studentDao.findByEmail(
                        student.getEmail()
                );

        /*
         * Same email already exists.
         */
        if (existing.isPresent()) {

            Student old = existing.get();

            /*
             * If previously deleted, allow reactivation
             * when admin intentionally creates the student again.
             */
            if (
                    old.getStatus()
                            == Student.Status.INACTIVE
            ) {

                old.setFirstName(
                        student.getFirstName()
                );

                old.setLastName(
                        student.getLastName()
                );

                old.setPhone(
                        student.getPhone()
                );

                old.setAddress(
                        student.getAddress()
                );

                old.setDateOfBirth(
                        student.getDateOfBirth()
                );

                old.setEnrollmentDate(
                        student.getEnrollmentDate()
                );

                old.setClassRoom(
                        student.getClassRoom()
                );

                old.setStatus(
                        Student.Status.ACTIVE
                );

                return studentDao.save(old);
            }

            throw new RuntimeException(
                    "Email already registered: "
                            + student.getEmail()
            );
        }

        student.setStatus(
                Student.Status.ACTIVE
        );

        return studentDao.save(student);
    }

    @Transactional
    public Student updateStudent(
            Long id,
            Student updated
    ) {

        Student existing =
                getStudentById(id);

        existing.setFirstName(
                updated.getFirstName()
        );

        existing.setLastName(
                updated.getLastName()
        );

        existing.setPhone(
                updated.getPhone()
        );

        existing.setAddress(
                updated.getAddress()
        );

        existing.setStatus(
                updated.getStatus()
        );

        existing.setClassRoom(
                updated.getClassRoom()
        );

        return studentDao.save(existing);
    }

    /**
     * Deletes student from current Students page
     * without physically deleting the database row.
     */
    @Transactional
    public void deleteStudent(Long id) {

        /*
         * First make sure the student exists.
         */
        getStudentById(id);

        /*
         * Direct DB update:
         *
         * status    = INACTIVE
         * classRoom = NULL
         *
         * This keeps Attendance / Marks / Fees safe.
         */
        int updated =
                studentDao.deactivateStudent(id);

        if (updated == 0) {

            throw new RuntimeException(
                    "Student could not be deleted: "
                            + id
            );
        }
    }
    @Transactional
    public int deleteStudents(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        return studentDao.deactivateStudents(ids);
    }

    @Transactional
    public int moveStudentsToClass(List<Long> ids, Long classId) {
        if (ids == null || ids.isEmpty() || classId == null) return 0;
        return studentDao.moveStudentsToClass(ids, classId);
    }

}