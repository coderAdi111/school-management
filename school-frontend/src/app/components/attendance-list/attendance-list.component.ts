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

  // =========================
  // DATA
  // =========================

  attendanceList: Attendance[] = [];

  classes: ClassRoom[] = [];

  // Dynamic academic hierarchy selectors
  selectedDepartment = '';
  selectedBranch = '';
  selectedSemester: number | '' = '';
  selectedSection = '';

  students: Student[] = [];


  // =========================
  // SELECTION
  // =========================

  selectedClassId: number | null = null;

  selectedSubject = '';

  selectedDate =
    new Date().toISOString().substring(0, 10);


  // =========================
  // MODES
  // =========================

  markingMode = false;


  // =========================
  // LOADING / ERROR
  // =========================

  loading = false;

  saving = false;

  errorMessage = '';


  // =========================
  // TABS
  // =========================

  activeTab:
    | 'mark'
    | 'history'
    | 'student'
    | 'subject'
    | 'overall' = 'mark';


  // =========================
  // REPORT DATA
  // =========================

  history: Attendance[] = [];

  studentSearch = '';

  selectedStudentId: number | null = null;

  studentReport: Attendance[] = [];

  // True only after the Student Report has actually been requested.
  // This lets us show a proper 0-record report without affecting attendance loading.
  studentReportLoaded = false;

  subjectReport: Attendance[] = [];

  overallReport: Attendance[] = [];


  // =========================
  // SUBJECTS
  // =========================

  subjects: string[] = [
    'IDS',
    'CCDT',
    'CN',
    'COA',
    'IB',
    'ML',
    'OS',
    'CN LAB',
    'MAD LAB',
    'ML LAB',
    'IT LAB'
  ];


  // =========================
  // CONSTRUCTOR
  // =========================

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

    this.loading = true;

    this.errorMessage = '';

    // Immediately update loading state
    this.cdr.detectChanges();


    this.classRoomService.getAll().subscribe({

      // =========================
      // SUCCESS
      // =========================

      next: (data: ClassRoom[]) => {

        console.log(
          'Attendance classes loaded:',
          data
        );


        // Keep every active/available class. The UI now exposes the
        // academic hierarchy instead of showing the internal Class name.
        this.classes = (data ?? []).filter(c => c.id != null);

        // Start with the first available hierarchy only when nothing is
        // selected. This keeps the selectors usable for any department,
        // branch, semester and section present in the database.
        if (!this.selectedDepartment && this.classes.length) {
          this.selectedDepartment = this.classes[0].department ?? '';
        }
        this.refreshAcademicOptions();


        this.loading = false;

        this.errorMessage = '';


        // Force UI update
        this.cdr.detectChanges();


        console.log(
          'Attendance classes loading finished.'
        );

      },


      // =========================
      // ERROR
      // =========================

      error: (error) => {

        console.error(
          'Attendance classes API loading error:',
          error
        );


        this.loading = false;

        this.classes = [];

        this.errorMessage =
          'Unable to load classes. Please Refresh karein.';


        this.cdr.detectChanges();

      }

    });

  }


  // =========================
  // ACADEMIC HIERARCHY
  // =========================

  get departmentOptions(): string[] {
    return Array.from(new Set(
      this.classes.map(c => c.department).filter((v): v is string => !!v)
    )).sort();
  }

  get branchOptions(): string[] {
    return Array.from(new Set(
      this.classes
        .filter(c => !this.selectedDepartment || c.department === this.selectedDepartment)
        .map(c => c.branch)
        .filter((v): v is string => !!v)
    )).sort();
  }

  get semesterOptions(): number[] {
    return Array.from(new Set(
      this.classes
        .filter(c => !this.selectedDepartment || c.department === this.selectedDepartment)
        .filter(c => !this.selectedBranch || c.branch === this.selectedBranch)
        .map(c => c.semester)
        .filter((v): v is number => v != null)
    )).sort((a, b) => a - b);
  }

  get sectionOptions(): string[] {
    return Array.from(new Set(
      this.classes
        .filter(c => !this.selectedDepartment || c.department === this.selectedDepartment)
        .filter(c => !this.selectedBranch || c.branch === this.selectedBranch)
        .filter(c => this.selectedSemester === '' || c.semester === Number(this.selectedSemester))
        .map(c => c.section)
        .filter((v): v is string => !!v)
    )).sort();
  }

  private refreshAcademicOptions(): void {
    if (this.selectedBranch && !this.branchOptions.includes(this.selectedBranch)) this.selectedBranch = '';
    if (this.selectedSemester !== '' && !this.semesterOptions.includes(Number(this.selectedSemester))) this.selectedSemester = '';
    if (this.selectedSection && !this.sectionOptions.includes(this.selectedSection)) this.selectedSection = '';
    this.resolveSelectedClass();
  }

  onDepartmentChange(): void {
    this.selectedBranch = '';
    this.selectedSemester = '';
    this.selectedSection = '';
    this.selectedClassId = null;
    this.onClassChange();
    this.cdr.detectChanges();
  }

  onBranchChange(): void {
    this.selectedSemester = '';
    this.selectedSection = '';
    this.selectedClassId = null;
    this.onClassChange();
    this.cdr.detectChanges();
  }

  onSemesterChange(): void {
    this.selectedSection = '';
    this.selectedClassId = null;
    this.onClassChange();
    this.cdr.detectChanges();
  }

  onSectionChange(): void {
    this.resolveSelectedClass();
    this.onClassChange();
    this.cdr.detectChanges();
  }

  private resolveSelectedClass(): void {
    const match = this.classes.find(c =>
      (!this.selectedDepartment || c.department === this.selectedDepartment) &&
      (!this.selectedBranch || c.branch === this.selectedBranch) &&
      (this.selectedSemester === '' || c.semester === Number(this.selectedSemester)) &&
      (!this.selectedSection || c.section === this.selectedSection)
    );
    this.selectedClassId = match?.id ?? null;
  }

  // =========================
  // CLASS CHANGE
  // =========================

  onClassChange(): void {

    this.attendanceList = [];

    this.markingMode = false;

    this.history = [];

    this.studentReport = [];
    this.studentReportLoaded = false;
    this.selectedStudentId = null;

    this.subjectReport = [];

    this.overallReport = [];

    this.errorMessage = '';

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


    if (!this.selectedSubject) {

      alert('Please select a subject.');

      return;

    }


    if (!this.selectedDate) {

      alert('Please select a date.');

      return;

    }


    // =========================
    // START LOADING
    // =========================

    this.loading = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    forkJoin({

      students:
        this.studentService.getByClass(
          this.selectedClassId
        ),

      attendance:
        this.attendanceService.getByClassAndDate(
          this.selectedClassId,
          this.selectedDate,
          this.selectedSubject
        )

    }).subscribe({

      // =========================
      // SUCCESS
      // =========================

      next: ({
        students,
        attendance
      }) => {

        console.log(
          'Attendance data loaded:',
          {
            students,
            attendance
          }
        );


        this.students = students ?? [];


        const selectedClass =
          this.classes.find(
            c =>
              c.id === this.selectedClassId
          );


        this.attendanceList =
          this.students.map(
            (student: Student) => {

              const existing =
                (attendance ?? []).find(
                  a =>
                    a.student?.id === student.id
                );


              if (existing) {

                return {

                  ...existing,

                  subject:
                    existing.subject ||
                    this.selectedSubject

                };

              }


              return {

                student,

                classRoom: selectedClass,

                date: this.selectedDate,

                subject: this.selectedSubject,

                status: 'PRESENT',

                remarks: ''

              } as Attendance;

            }
          );


        this.markingMode = true;

        this.loading = false;

        this.errorMessage = '';

        this.activeTab = 'mark';


        // =========================
        // FORCE UI UPDATE
        // =========================

        this.cdr.detectChanges();


        console.log(
          'Attendance loading finished.'
        );

      },


      // =========================
      // ERROR
      // =========================

      error: (error) => {

        console.error(
          'Attendance API loading error:',
          error
        );


        this.loading = false;

        this.attendanceList = [];

        this.markingMode = false;

        this.errorMessage =
          'Unable to load attendance. Please Refresh karein.';


        this.cdr.detectChanges();

      }

    });

  }


  // =========================
  // REFRESH ATTENDANCE
  // =========================

  refreshAttendance(): void {

    console.log(
      'Refreshing attendance...'
    );


    // If class + subject + date are selected,
    // reload the attendance data.

    if (
      this.selectedClassId !== null &&
      this.selectedSubject &&
      this.selectedDate
    ) {

      this.loadAttendance();

      return;

    }


    // Otherwise reload classes

    this.loadClasses();

  }


  // =========================
  // STATUS
  // =========================

  updateStatus(
    record: Attendance,
    status:
      | 'PRESENT'
      | 'ABSENT'
      | 'LATE'
      | 'EXCUSED'
  ): void {

    record.status = status;

    this.cdr.detectChanges();

  }


  // =========================
  // MARK ALL PRESENT
  // =========================

  markAllPresent(): void {

    this.attendanceList.forEach(
      record =>
        record.status = 'PRESENT'
    );

    this.cdr.detectChanges();

  }


  // =========================
  // MARK ALL ABSENT
  // =========================

  markAllAbsent(): void {

    this.attendanceList.forEach(
      record =>
        record.status = 'ABSENT'
    );

    this.cdr.detectChanges();

  }


  // =========================
  // SUMMARY
  // =========================

  get totalCount(): number {

    return this.attendanceList.length;

  }


  get presentCount(): number {

    return this.attendanceList.filter(
      a =>
        a.status === 'PRESENT'
    ).length;

  }


  get absentCount(): number {

    return this.attendanceList.filter(
      a =>
        a.status === 'ABSENT'
    ).length;

  }


  get lateCount(): number {

    return this.attendanceList.filter(
      a =>
        a.status === 'LATE'
    ).length;

  }


  get excusedCount(): number {

    return this.attendanceList.filter(
      a =>
        a.status === 'EXCUSED'
    ).length;

  }


  // =========================
  // SAVE
  // =========================

  saveAttendance(): void {

    if (
      this.selectedClassId === null ||
      !this.selectedSubject
    ) {

      alert(
        'Please select class and subject.'
      );

      return;

    }


    if (!this.attendanceList.length) {

      alert(
        'No students found.'
      );

      return;

    }


    this.saving = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    const requests =
      this.attendanceList.map(
        record => {

          record.subject =
            this.selectedSubject;

          record.date =
            this.selectedDate;


          if (record.id != null) {

            return this.attendanceService.update(
              record.id,
              record
            );

          }


          return this.attendanceService.create(
            record.student!.id!,
            this.selectedClassId!,
            this.selectedDate,
            this.selectedSubject,
            record.status,
            record.remarks || ''
          );

        }
      );


    forkJoin(requests).subscribe({

      // =========================
      // SUCCESS
      // =========================

      next: () => {

        this.saving = false;

        this.errorMessage = '';

        this.cdr.detectChanges();


        alert(
          'Attendance saved successfully!'
        );


        // Reload latest data
        this.loadAttendance();

      },


      // =========================
      // ERROR
      // =========================

      error: (error) => {

        console.error(
          'Error saving attendance:',
          error
        );


        this.saving = false;

        this.errorMessage =
          'Failed to save attendance. Please try again.';


        this.cdr.detectChanges();


        alert(
          'Failed to save attendance.'
        );

      }

    });

  }


  // =========================
  // HISTORY
  // =========================

  loadHistory(): void {

    if (
      this.selectedClassId === null ||
      !this.selectedSubject
    ) {

      return;

    }


    this.loading = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    this.attendanceService
      .getByClassAndSubject(
        this.selectedClassId,
        this.selectedSubject
      )
      .subscribe({

        next: data => {

          this.history = data ?? [];

          this.loading = false;

          this.errorMessage = '';

          this.activeTab = 'history';

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'History error:',
            error
          );


          this.loading = false;

          this.history = [];

          this.errorMessage =
            'Unable to load attendance history.';


          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // OPEN STUDENT REPORT
  // =========================

  openStudentReport(): void {

    if (this.selectedClassId === null) {
      alert('Please select a class.');
      return;
    }

    this.activeTab = 'student';

    // Students are already loaded after Load Attendance.
    // If not, load them here so the dropdown also works when
    // Student Report is opened first.
    if (this.students.length > 0) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    this.studentService
      .getByClass(this.selectedClassId)
      .subscribe({

        next: (data: Student[]) => {

          this.students = data ?? [];

          this.loading = false;
          this.errorMessage = '';

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Student Report student loading error:',
            error
          );

          this.loading = false;
          this.students = [];

          this.errorMessage =
            'Unable to load students for report.';

          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // STUDENT REPORT
  // =========================

  loadStudentReport(): void {

    if (!this.selectedStudentId) {

      alert(
        'Please select a student.'
      );

      return;

    }

    if (!this.selectedSubject) {

      alert(
        'Please select a subject.'
      );

      return;

    }

    this.loading = true;
    this.errorMessage = '';
    this.studentReportLoaded = false;

    this.cdr.detectChanges();

    this.attendanceService
      .getByStudent(
        this.selectedStudentId
      )
      .subscribe({

        next: data => {

          const allRecords =
            data ?? [];

          const selectedSubject =
            this.selectedSubject
              .trim()
              .toLowerCase();

          // Student report is for the subject currently
          // selected in the main filter.
          this.studentReport =
            allRecords.filter(
              record =>
                (record.subject ?? '')
                  .trim()
                  .toLowerCase() ===
                selectedSubject
            );

          this.studentReportLoaded = true;
          this.activeTab = 'student';
          this.loading = false;
          this.errorMessage = '';

          this.cdr.detectChanges();

          console.log(
            'Student report loaded:',
            {
              studentId:
                this.selectedStudentId,
              subject:
                this.selectedSubject,
              records:
                this.studentReport
            }
          );

        },

        error: error => {

          console.error(
            'Student report error:',
            error
          );

          this.loading = false;
          this.studentReport = [];
          this.studentReportLoaded = false;

          this.errorMessage =
            'Unable to load student report.';

          this.cdr.detectChanges();

        }

      });

  }

  // =========================
  // SUBJECT REPORT
  // =========================

  loadSubjectReport(): void {

    if (
      this.selectedClassId === null ||
      !this.selectedSubject
    ) {

      alert(
        'Please select class and subject.'
      );

      return;

    }


    this.loading = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    this.attendanceService
      .getByClassAndSubject(
        this.selectedClassId,
        this.selectedSubject
      )
      .subscribe({

        next: data => {

          this.subjectReport =
            data ?? [];

          this.activeTab = 'subject';

          this.loading = false;

          this.errorMessage = '';

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Subject report error:',
            error
          );


          this.loading = false;

          this.subjectReport = [];

          this.errorMessage =
            'Unable to load subject report.';


          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // OVERALL REPORT
  // =========================

  loadOverallReport(): void {

    if (this.selectedClassId === null) {

      alert(
        'Please select a class.'
      );

      return;

    }


    this.loading = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    this.attendanceService
      .getByClass(
        this.selectedClassId
      )
      .subscribe({

        next: data => {

          this.overallReport =
            data ?? [];

          this.activeTab = 'overall';

          this.loading = false;

          this.errorMessage = '';

          this.cdr.detectChanges();

        },


        error: error => {

          console.error(
            'Overall report error:',
            error
          );


          this.loading = false;

          this.overallReport = [];

          this.errorMessage =
            'Unable to load overall report.';


          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // PERCENTAGE
  // =========================

  percentage(
    records: Attendance[]
  ): number {

    if (!records.length) {

      return 0;

    }


    const attended =
      records.filter(
        a =>
          a.status === 'PRESENT' ||
          a.status === 'LATE'
      ).length;


    return Math.round(
      (attended / records.length) * 100
    );

  }


  // =========================
  // STUDENT NAME
  // =========================

  studentName(
    student?: Student
  ): string {

    if (!student) {

      return '-';

    }


    return `${student.firstName} ${student.lastName}`;

  }


  // =========================
  // ENROLLMENT
  // =========================

  enrollment(
    student?: Student
  ): string {

    if (!student?.email) {

      return '-';

    }


    return student.email
      .split('@')[0]
      .toUpperCase();

  }


  // =========================
  // FILTER STUDENTS
  // =========================

  get filteredStudents(): Student[] {

    const search =
      this.studentSearch
        .trim()
        .toLowerCase();


    if (!search) {

      return this.students;

    }


    return this.students.filter(
      s =>
        this.studentName(s)
          .toLowerCase()
          .includes(search) ||

        this.enrollment(s)
          .toLowerCase()
          .includes(search)
    );

  }


  // =========================
  // REPORT COUNTS
  // =========================

  countStatus(
    records: Attendance[],
    status:
      | 'PRESENT'
      | 'ABSENT'
      | 'LATE'
      | 'EXCUSED'
  ): number {

    return records.filter(
      r =>
        r.status === status
    ).length;

  }

}