import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { HttpClient } from '@angular/common/http';

import { forkJoin } from 'rxjs';

import {
  Student,
  ClassRoom,
  Attendance,
  Fee,
  Mark
} from '../../models/models';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  // =========================
  // DATA
  // =========================

  students: Student[] = [];

  classes: ClassRoom[] = [];

  attendance: Attendance[] = [];

  fees: Fee[] = [];

  marks: Mark[] = [];


  // =========================
  // LOADING
  // =========================

  loading = true;

  errorMessage = '';


  // =========================
  // ATTENDANCE
  // =========================

  presentCount = 0;

  absentCount = 0;

  lateCount = 0;

  excusedCount = 0;


  // =========================
  // FEES
  // =========================

  pendingFees = 0;

  paidFees = 0;

  overdueFees = 0;

  waivedFees = 0;


  // =========================
  // MARKS
  // =========================

  averagePercentage = 0;


  // =========================
  // API
  // =========================

  private api = 'http://localhost:8080/api';


  // =========================
  // CONSTRUCTOR
  // =========================

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadDashboard();

  }


  // =========================
  // LOAD DASHBOARD
  // =========================

  loadDashboard(): void {

    this.loading = true;

    this.errorMessage = '';

    // Immediately update loading state
    this.cdr.detectChanges();


    forkJoin({

      students: this.http.get<Student[]>(
        `${this.api}/students`
      ),

      classes: this.http.get<ClassRoom[]>(
        `${this.api}/classes`
      ),

      attendance: this.http.get<Attendance[]>(
        `${this.api}/attendance`
      ),

      fees: this.http.get<Fee[]>(
        `${this.api}/fees`
      ),

      marks: this.http.get<Mark[]>(
        `${this.api}/marks`
      )

    }).subscribe({

      // =========================
      // SUCCESS
      // =========================

      next: (data) => {

        console.log(
          'Dashboard data loaded:',
          data
        );


        // =========================
        // STORE DATA
        // =========================

        // Current college data only: 5th Semester IT, sections I1/I2.
        this.students =
          (data.students ?? []).filter(student =>
            student.classRoom?.grade === '5th Semester' &&
            (student.classRoom?.section === 'I1' ||
             student.classRoom?.section === 'I2')
          );

        this.classes =
          (data.classes ?? []).filter(classRoom =>
            classRoom.grade === '5th Semester' &&
            (classRoom.section === 'I1' ||
             classRoom.section === 'I2')
          );

        const currentStudentIds = new Set(
          this.students
            .map(student => student.id)
            .filter((id): id is number => id !== undefined)
        );

        const currentClassIds = new Set(
          this.classes
            .map(classRoom => classRoom.id)
            .filter((id): id is number => id !== undefined)
        );

        this.attendance =
          (data.attendance ?? []).filter(record =>
            (record.student?.id !== undefined && currentStudentIds.has(record.student.id)) ||
            (record.classRoom?.id !== undefined && currentClassIds.has(record.classRoom.id))
          );

        this.fees =
          (data.fees ?? []).filter(record =>
            record.student?.id !== undefined && currentStudentIds.has(record.student.id)
          );

        this.marks =
          (data.marks ?? []).filter(record =>
            (record.student?.id !== undefined && currentStudentIds.has(record.student.id)) ||
            (record.classRoom?.id !== undefined && currentClassIds.has(record.classRoom.id))
          );


        // =========================
        // CALCULATE
        // =========================

        this.calculateAttendance();

        this.calculateFees();

        this.calculateMarks();


        // =========================
        // STOP LOADING
        // =========================

        this.loading = false;

        this.errorMessage = '';


        // =========================
        // FORCE UI UPDATE
        // =========================

        this.cdr.detectChanges();


        console.log(
          'Dashboard loading finished.'
        );

      },


      // =========================
      // ERROR
      // =========================

      error: (error: any) => {

        console.error(
          'Dashboard API loading error:',
          error
        );


        this.loading = false;


        this.errorMessage =
          'Unable to load dashboard data.';


        // =========================
        // FORCE UI UPDATE
        // =========================

        this.cdr.detectChanges();

      }

    });

  }


  // =========================
  // ATTENDANCE SUMMARY
  // =========================

  calculateAttendance(): void {

    this.presentCount =
      this.attendance.filter(
        attendance =>
          attendance.status === 'PRESENT'
      ).length;


    this.absentCount =
      this.attendance.filter(
        attendance =>
          attendance.status === 'ABSENT'
      ).length;


    this.lateCount =
      this.attendance.filter(
        attendance =>
          attendance.status === 'LATE'
      ).length;


    this.excusedCount =
      this.attendance.filter(
        attendance =>
          attendance.status === 'EXCUSED'
      ).length;

  }


  // =========================
  // FEE SUMMARY
  // =========================

  calculateFees(): void {

    this.pendingFees =
      this.fees.filter(
        fee =>
          fee.status === 'PENDING'
      ).length;


    this.paidFees =
      this.fees.filter(
        fee =>
          fee.status === 'PAID'
      ).length;


    this.overdueFees =
      this.fees.filter(
        fee =>
          fee.status === 'OVERDUE'
      ).length;


    this.waivedFees =
      this.fees.filter(
        fee =>
          fee.status === 'WAIVED'
      ).length;

  }


  // =========================
  // MARKS SUMMARY
  // =========================

  calculateMarks(): void {

    if (this.marks.length === 0) {

      this.averagePercentage = 0;

      return;

    }


    let totalPercentage = 0;

    let validMarksCount = 0;


    this.marks.forEach(
      mark => {

        if (
          mark.totalMarks &&
          mark.totalMarks > 0 &&
          mark.marksObtained !== null &&
          mark.marksObtained !== undefined
        ) {

          totalPercentage +=
            (
              mark.marksObtained /
              mark.totalMarks
            ) * 100;


          validMarksCount++;

        }

      }
    );


    if (validMarksCount === 0) {

      this.averagePercentage = 0;

      return;

    }


    this.averagePercentage =
      totalPercentage /
      validMarksCount;

  }


  // =========================
  // REFRESH
  // =========================

  refreshDashboard(): void {

    this.loadDashboard();

  }

}