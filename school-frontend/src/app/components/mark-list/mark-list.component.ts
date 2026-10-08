import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { MarkService } from '../../services/mark.service';
import { StudentService } from '../../services/student.services';
import { AcademicService } from '../../services/academic.service';

import {
  Mark,
  Student,
  ClassRoom, AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection
} from '../../models/models';

@Component({
  selector: 'app-mark-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './mark-list.component.html',
  styleUrl: './mark-list.css'
})
export class MarkListComponent implements OnInit {

  marks: Mark[] = [];

  students: Student[] = [];

  classes: ClassRoom[] = [];

  // Academic hierarchy filters
  departments: AcademicDepartment[] = [];
  branches: AcademicBranch[] = [];
  semesters: AcademicSemester[] = [];
  sections: AcademicSection[] = [];

  selectedDepartmentId: number | null = null;
  selectedBranchId: number | null = null;
  selectedSemesterId: number | null = null;
  selectedSectionId: number | null = null;

  filteredStudents: Student[] = [];

  loading = false;

  saving = false;

  errorMessage = '';

  showForm = false;

  editing = false;

  selectedMarkId: number | null = null;

  formMark: Mark = this.emptyMark();
private classUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api/classes'
      : 'https://school-management-vy1j.onrender.com/api/classes';
  constructor(
    private markService: MarkService,
    private studentService: StudentService,
    private academicService: AcademicService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadAcademicFilters();

    this.loadMarks();

    this.loadStudents();

    this.loadClasses();
  }


  // =========================
  // LOAD MARKS
  // =========================

  loadMarks(): void {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.detectChanges();

    this.markService.getAll().subscribe({

      next: (data: Mark[]) => {

        console.log(
          'MARKS DATA RECEIVED:',
          data
        );

        this.marks = data ?? [];
        this.applyAcademicFilters();

        this.loading = false;

        this.errorMessage = '';

        console.log(
          'MARKS ARRAY:',
          this.marks
        );

        console.log(
          'LOADING:',
          this.loading
        );

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'ERROR LOADING MARKS:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load marks.';

        this.cdr.detectChanges();
      }

    });
  }


  // =========================
  // LOAD STUDENTS
  // =========================

  loadStudents(): void {

    this.studentService.getAll().subscribe({

      next: (data: Student[]) => {

        console.log(
          'Students loaded for marks:',
          data
        );

        this.students = data ?? [];
        this.applyAcademicFilters();

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'Error loading students:',
          error
        );
      }

    });
  }


  // =========================
  // LOAD CLASSES
  // =========================

  loadClasses(): void {

    this.http
      .get<ClassRoom[]>(this.classUrl)
      .subscribe({

        next: (data: ClassRoom[]) => {

          console.log(
            'Classes loaded for marks:',
            data
          );

          this.classes = data ?? [];

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'Error loading classes:',
            error
          );
        }

      });
  }



  // =========================
  // ACADEMIC FILTERS
  // =========================

  loadAcademicFilters(): void {
    this.academicService.departments().subscribe({
      next: d => this.departments = (d ?? []).filter(x => x.active !== false)
    });
  }

  onDepartmentFilterChange(): void {
    this.selectedBranchId = null;
    this.selectedSemesterId = null;
    this.selectedSectionId = null;
    this.branches = [];
    this.semesters = [];
    this.sections = [];
    if (this.selectedDepartmentId != null) {
      this.academicService.branches(this.selectedDepartmentId).subscribe({
        next: b => this.branches = (b ?? []).filter(x => x.active !== false)
      });
    }
    this.applyAcademicFilters();
  }

  onBranchFilterChange(): void {
    this.selectedSemesterId = null;
    this.selectedSectionId = null;
    this.semesters = [];
    this.sections = [];
    if (this.selectedBranchId != null) {
      this.academicService.semesters(this.selectedBranchId).subscribe({
        next: s => this.semesters = (s ?? []).filter(x => x.active !== false)
      });
    }
    this.applyAcademicFilters();
  }

  onSemesterFilterChange(): void {
    this.selectedSectionId = null;
    this.sections = [];
    if (this.selectedSemesterId != null) {
      this.academicService.sections(this.selectedSemesterId).subscribe({
        next: s => this.sections = (s ?? []).filter(x => x.active !== false)
      });
    }
    this.applyAcademicFilters();
  }

  onSectionFilterChange(): void {
    this.applyAcademicFilters();
  }

  resetAcademicFilters(): void {
    this.selectedDepartmentId = null;
    this.selectedBranchId = null;
    this.selectedSemesterId = null;
    this.selectedSectionId = null;
    this.branches = [];
    this.semesters = [];
    this.sections = [];
    this.applyAcademicFilters();
  }

  private classMatchesAcademic(cls?: ClassRoom): boolean {
    if (!cls) return false;

    const deptValue = String(cls.department ?? '').trim().toLowerCase();
    const branchValue = String(cls.branch ?? '').trim().toLowerCase();
    const semesterValue = Number(cls.semester ?? 0);

    const department = this.departments.find(d => d.id === this.selectedDepartmentId);
    const branch = this.branches.find(b => b.id === this.selectedBranchId);
    const semester = this.semesters.find(s => s.id === this.selectedSemesterId);
    const section = this.sections.find(s => s.id === this.selectedSectionId);

    const deptMatch = !department ||
      deptValue === String(department.name ?? '').trim().toLowerCase() ||
      deptValue === String((department as any).code ?? '').trim().toLowerCase();

    const branchMatch = !branch ||
      branchValue === String(branch.name ?? '').trim().toLowerCase() ||
      branchValue === String((branch as any).code ?? '').trim().toLowerCase();

    const semesterMatch = !semester ||
      semesterValue === Number((semester as any).semesterNumber ?? (semester as any).number ?? 0) ||
      String(cls.grade ?? '').trim().toLowerCase() === String(semester.name ?? '').trim().toLowerCase();

    const sectionMatch = !section ||
      String(cls.section ?? '').trim().toLowerCase() === String(section.name ?? '').trim().toLowerCase();

    return deptMatch && branchMatch && semesterMatch && sectionMatch;
  }

  applyAcademicFilters(): void {
    this.filteredStudents = (this.students ?? []).filter(s =>
      this.classMatchesAcademic(s.classRoom)
    );

    // Keep the add/edit dropdown scoped to the selected academic hierarchy.
    if (this.formMark && this.formMark.student?.id) {
      const selected = this.students.find(s => s.id === this.formMark.student?.id);
      if (selected && !this.classMatchesAcademic(selected.classRoom)) {
        this.formMark.student = undefined;
      }
    }
  }

  get filteredMarks(): Mark[] {
    return (this.marks ?? []).filter(m =>
      this.classMatchesAcademic(m.student?.classRoom ?? m.classRoom)
    );
  }

  get filteredClasses(): ClassRoom[] {
    return (this.classes ?? []).filter(cls =>
      this.classMatchesAcademic(cls)
    );
  }

  // =========================
  // EMPTY MARK
  // =========================

  emptyMark(): Mark {

    return {

      student: undefined,

      classRoom: undefined,

      subject: '',

      examType: '',

      marksObtained: 0,

      totalMarks: 100,

      examDate: '',

      remarks: ''

    };
  }


  // =========================
  // ADD FORM
  // =========================

  openAddForm(): void {

    this.editing = false;

    this.selectedMarkId = null;

    this.formMark =
      this.emptyMark();

    this.showForm = true;

    this.cdr.detectChanges();
  }


  // =========================
  // EDIT FORM
  // =========================

  openEditForm(
    mark: Mark
  ): void {

    this.editing = true;

    this.selectedMarkId =
      mark.id ?? null;

    this.formMark = {

      ...mark,

      student: mark.student
        ? {
            ...mark.student
          }
        : undefined,

      classRoom: mark.classRoom
        ? {
            ...mark.classRoom,

            teacher: mark.classRoom.teacher
              ? {
                  ...mark.classRoom.teacher
                }
              : undefined
          }
        : undefined

    };

    this.showForm = true;

    this.cdr.detectChanges();
  }


  // =========================
  // CLOSE FORM
  // =========================

  closeForm(): void {

    this.showForm = false;

    this.editing = false;

    this.selectedMarkId = null;

    this.formMark =
      this.emptyMark();

    this.cdr.detectChanges();
  }


  // =========================
  // STUDENT CHANGE
  // =========================

  onStudentChange(
    event: Event
  ): void {

    const value =
      (event.target as HTMLSelectElement).value;

    if (!value) {

      this.formMark.student =
        undefined;

      return;
    }

    const studentId =
      Number(value);

    const selectedStudent =
      this.students.find(
        student =>
          student.id === studentId
      );

    this.formMark.student =
      selectedStudent;


    // =========================
    // AUTO SELECT STUDENT CLASS
    // =========================

    if (
      selectedStudent?.classRoom?.id
    ) {

      const classId =
        selectedStudent.classRoom.id;

      const selectedClass =
        this.classes.find(
          cls =>
            cls.id === classId
        );

      this.formMark.classRoom =
        selectedClass ??
        selectedStudent.classRoom;
    }

    this.cdr.detectChanges();
  }


  // =========================
  // CLASS CHANGE
  // =========================

  onClassChange(
    event: Event
  ): void {

    const value =
      (event.target as HTMLSelectElement).value;

    if (!value) {

      this.formMark.classRoom =
        undefined;

      return;
    }

    const classId =
      Number(value);

    const selectedClass =
      this.classes.find(
        cls =>
          cls.id === classId
      );

    this.formMark.classRoom =
      selectedClass;

    this.cdr.detectChanges();
  }


  // =========================
  // SAVE MARK
  // =========================

  saveMark(): void {

    // STUDENT
    if (
      !this.formMark.student?.id
    ) {

      alert(
        'Please select a student.'
      );

      return;
    }


    // CLASS
    if (
      !this.formMark.classRoom?.id
    ) {

      alert(
        'Please select a class.'
      );

      return;
    }


    // SUBJECT
    if (
      !this.formMark.subject?.trim()
    ) {

      alert(
        'Please enter subject.'
      );

      return;
    }


    // EXAM TYPE
    if (
      !this.formMark.examType?.trim()
    ) {

      alert(
        'Please enter exam type.'
      );

      return;
    }


    // MARKS OBTAINED
    if (
      this.formMark.marksObtained === null ||
      this.formMark.marksObtained === undefined ||
      this.formMark.marksObtained < 0
    ) {

      alert(
        'Please enter valid marks obtained.'
      );

      return;
    }


    // TOTAL MARKS
    if (
      !this.formMark.totalMarks ||
      this.formMark.totalMarks <= 0
    ) {

      alert(
        'Please enter valid total marks.'
      );

      return;
    }


    // MARKS VALIDATION
    if (
      this.formMark.marksObtained >
      this.formMark.totalMarks
    ) {

      alert(
        'Marks obtained cannot be greater than total marks.'
      );

      return;
    }


    // EXAM DATE
    if (
      !this.formMark.examDate
    ) {

      alert(
        'Please select exam date.'
      );

      return;
    }


    this.saving = true;

    this.cdr.detectChanges();


    // =========================
    // PREPARE MARK
    // =========================

    const markToSave: Mark = {

      ...this.formMark,


      // STUDENT
      student: {

        id:
          this.formMark.student.id,

        firstName:
          this.formMark.student.firstName,

        lastName:
          this.formMark.student.lastName,

        email:
          this.formMark.student.email

      },


      // CLASS
      classRoom: {

        id:
          this.formMark.classRoom.id,

        name:
          this.formMark.classRoom.name,

        grade:
          this.formMark.classRoom.grade,

        section:
          this.formMark.classRoom.section,

        department:
          this.formMark.classRoom.department,

        branch:
          this.formMark.classRoom.branch,

        semester:
          this.formMark.classRoom.semester,

        // NEW TEACHER RELATION
        teacher:
          this.formMark.classRoom.teacher
            ? {
                ...this.formMark.classRoom.teacher
              }
            : undefined,

        capacity:
          this.formMark.classRoom.capacity

      }

    };


    console.log(
      'Saving mark:',
      markToSave
    );


    // =========================
    // UPDATE
    // =========================

    if (
      this.editing &&
      this.selectedMarkId !== null
    ) {

      this.markService.update(
        this.selectedMarkId,
        markToSave
      ).subscribe({

        next: () => {

          alert(
            'Marks updated successfully!'
          );

          window.location.reload();
        },

        error: (error: any) => {

          console.error(
            'Error updating marks:',
            error
          );

          this.saving = false;

          this.cdr.detectChanges();

          alert(
            'Failed to update marks.'
          );
        }

      });

      return;
    }


    // =========================
    // CREATE
    // =========================

    this.markService
      .create(markToSave)
      .subscribe({

        next: () => {

          alert(
            'Marks added successfully!'
          );

          window.location.reload();
        },

        error: (error: any) => {

          console.error(
            'Error creating marks:',
            error
          );

          this.saving = false;

          this.cdr.detectChanges();

          alert(
            'Failed to add marks.'
          );
        }

      });
  }


  // =========================
  // DELETE MARK
  // =========================

  deleteMark(
    mark: Mark
  ): void {

    if (!mark.id) {

      return;
    }


    const studentName =

      `${mark.student?.firstName ?? ''} ` +
      `${mark.student?.lastName ?? ''}`
        .trim();


    const confirmed =
      confirm(
        `Delete marks for ${
          studentName || 'this student'
        }?`
      );


    if (!confirmed) {

      return;
    }


    this.markService
      .delete(mark.id)
      .subscribe({

        next: () => {

          alert(
            'Marks deleted successfully!'
          );

          window.location.reload();
        },

        error: (error: any) => {

          console.error(
            'Error deleting marks:',
            error
          );

          alert(
            'Failed to delete marks.'
          );
        }

      });
  }


  // =========================
  // PERCENTAGE
  // =========================

  getPercentage(
    mark: Mark
  ): number {

    if (
      !mark.totalMarks ||
      mark.totalMarks <= 0
    ) {

      return 0;
    }

    return (
      mark.marksObtained /
      mark.totalMarks
    ) * 100;
  }


  // =========================
  // GRADE
  // =========================

  getGrade(
    mark: Mark
  ): string {

    const percentage =
      this.getPercentage(mark);


    if (percentage >= 90) {

      return 'A+';
    }


    if (percentage >= 80) {

      return 'A';
    }


    if (percentage >= 70) {

      return 'B';
    }


    if (percentage >= 60) {

      return 'C';
    }


    if (percentage >= 50) {

      return 'D';
    }


    return 'F';
  }

}