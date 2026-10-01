import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AttendanceService } from '../../services/attendance.services';
import { ClassroomService } from '../../services/classroom.services';
import { StudentService } from '../../services/student.services';

import {
  Attendance,
  ClassRoom,
  Student
} from '../../models/models';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.css']
})
export class AttendanceListComponent implements OnInit {

  attendanceList: Attendance[] = [];

  classes: ClassRoom[] = [];

  selectedClassId: number | null = null;

  selectedDate =
    new Date().toISOString().substring(0, 10);

  markingMode = false;

  loading = false;


  constructor(
    private attendanceService: AttendanceService,
    private classRoomService: ClassroomService,
    private studentService: StudentService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadClasses();
  }


  // =========================
  // LOAD CLASSES
  // =========================

  loadClasses(): void {

    console.log(
      'Loading classes for attendance...'
    );

    this.classRoomService.getAll().subscribe({

      next: (data: ClassRoom[]) => {

        console.log(
          'Attendance classes received:',
          data
        );

        this.classes = (data ?? []).filter(classRoom =>
  classRoom.grade === '5th Semester' &&
  (classRoom.section === 'I1' || classRoom.section === 'I2')
);

        console.log(
          'Attendance classes array:',
          this.classes
        );

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'Error loading classes:',
          error
        );

        this.classes = [];

        this.cdr.detectChanges();
      }

    });
  }


  // =========================
  // CLASS DROPDOWN CHANGE
  // =========================

  onClassChange(event: Event): void {

    const value =
      (event.target as HTMLSelectElement).value;

    this.selectedClassId =
      value ? Number(value) : null;

    console.log(
      'Selected class:',
      this.selectedClassId
    );

    this.cdr.detectChanges();
  }


  // =========================
  // LOAD ATTENDANCE
  // =========================

  loadAttendance(): void {

    if (this.selectedClassId === null) {

      alert('Please select a class.');

      return;
    }

    this.loading = true;

    this.cdr.detectChanges();


    forkJoin({

      students:
        this.studentService.getByClass(
          this.selectedClassId
        ),

      attendance:
        this.attendanceService.getByClassAndDate(
          this.selectedClassId,
          this.selectedDate
        )

    }).subscribe({

      next: ({
        students,
        attendance
      }) => {

        console.log(
          'Attendance students:',
          students
        );

        console.log(
          'Attendance records:',
          attendance
        );


        const selectedClass =
          this.classes.find(
            c =>
              c.id === this.selectedClassId
          );


        this.attendanceList =
          students.map(
            (student: Student) => {

              const existingAttendance =
                attendance.find(
                  a =>
                    a.student?.id ===
                    student.id
                );


              // Already saved attendance
              if (existingAttendance) {

                return existingAttendance;
              }


              // New attendance record
              return {

                student: student,

                classRoom: selectedClass,

                date: this.selectedDate,

                status: 'PRESENT',

                remarks: ''

              } as Attendance;

            }
          );


        this.markingMode = true;

        this.loading = false;


        console.log(
          'Attendance list:',
          this.attendanceList
        );

        console.log(
          'Attendance loading:',
          this.loading
        );


        this.cdr.detectChanges();
      },


      error: (error: any) => {

        console.error(
          'Error loading attendance:',
          error
        );

        this.loading = false;

        this.cdr.detectChanges();

        alert(
          'Unable to load attendance.'
        );
      }

    });
  }


  // =========================
  // UPDATE STATUS
  // =========================

  updateStatus(
    record: Attendance,
    status:
      'PRESENT'
      | 'ABSENT'
      | 'LATE'
      | 'EXCUSED'
  ): void {

    record.status = status;

    this.cdr.detectChanges();
  }


  // =========================
  // SAVE ATTENDANCE
  // =========================

  saveAttendance(): void {

    if (this.selectedClassId === null) {

      alert(
        'Please select a class.'
      );

      return;
    }


    if (
      this.attendanceList.length === 0
    ) {

      alert(
        'No students found.'
      );

      return;
    }


    const requests =
      this.attendanceList.map(
        record => {

          // Existing attendance → UPDATE
          if (record.id != null) {

            return this.attendanceService.update(
              record.id,
              record
            );
          }


          // New attendance → CREATE
          return this.attendanceService.create(
            record.student!.id!,
            this.selectedClassId!,
            this.selectedDate,
            record.status,
            record.remarks || ''
          );

        }
      );


    forkJoin(requests).subscribe({

      next: () => {

        alert(
          'Attendance saved successfully!'
        );

        window.location.reload();
      },


      error: (error: any) => {

        console.error(
          'Error saving attendance:',
          error
        );

        alert(
          'Failed to save attendance.'
        );
      }

    });
  }

}