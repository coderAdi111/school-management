import { Component, OnInit } from '@angular/core';
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
  selectedDate = new Date().toISOString().substring(0, 10);

  markingMode = false;
  loading = false;

  constructor(
    private attendanceService: AttendanceService,
    private classRoomService: ClassroomService,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.classRoomService.getAll().subscribe({
      next: (data: ClassRoom[]) => {
        this.classes = data;
      },
      error: (error) => {
        console.error('Error loading classes:', error);
      }
    });
  }

  // Class dropdown change
  onClassChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedClassId = value ? Number(value) : null;
  }

  loadAttendance(): void {

    if (this.selectedClassId === null) {
      alert('Please select a class.');
      return;
    }

    this.loading = true;

    forkJoin({
      students: this.studentService.getByClass(this.selectedClassId),

      attendance: this.attendanceService.getByClassAndDate(
        this.selectedClassId,
        this.selectedDate
      )
    }).subscribe({

      next: ({ students, attendance }) => {

        const selectedClass = this.classes.find(
          c => c.id === this.selectedClassId
        );

        this.attendanceList = students.map((student: Student) => {

          const existingAttendance = attendance.find(
            a => a.student?.id === student.id
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

        });

        this.markingMode = true;
        this.loading = false;
      },

      error: (error) => {

        console.error('Error loading attendance:', error);

        this.loading = false;

        alert('Unable to load attendance.');
      }

    });
  }

  updateStatus(
    record: Attendance,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  ): void {

    record.status = status;
  }

  saveAttendance(): void {

    if (this.selectedClassId === null) {
      alert('Please select a class.');
      return;
    }

    if (this.attendanceList.length === 0) {
      alert('No students found.');
      return;
    }

    const requests = this.attendanceList.map(record => {

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

    });

    forkJoin(requests).subscribe({

     next: () => {
  alert('Attendance saved successfully!');
  window.location.reload();
},

      error: (error) => {

        console.error('Error saving attendance:', error);

        alert('Failed to save attendance.');
      }

    });
  }
}