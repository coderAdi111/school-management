import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic.service';
import { StudentService } from '../../services/student.services';
import { ClassroomService } from '../../services/classroom.services';
import {
  AcademicDepartment,
  AcademicBranch,
  AcademicSemester,
  AcademicSection,
  Student,
  ClassRoom
} from '../../models/models';

interface SectionOverview {
  department: string;
  branch: string;
  branchCode?: string;
  semester: string;
  semesterNumber: number;
  section: string;
  students: number;
  activeStudents: number;
  capacity: number;
  classTeacher: string;
  classTeacherSubject: string;
  classId?: number;
}

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-list.html',
  styleUrls: ['./class-list.css']
})
export class ClassList implements OnInit {
  departments: AcademicDepartment[] = [];
  rows: SectionOverview[] = [];
  filteredRows: SectionOverview[] = [];

  loading = true;
  errorMessage = '';

  // Live cascading filters.
  selectedDepartment = '';
  selectedBranch = '';
  selectedSemester = '';
  selectedSection = '';
  search = '';

  totalStudents = 0;
  totalActive = 0;
  totalCapacity = 0;

  private students: Student[] = [];
  private classrooms: ClassRoom[] = [];

  constructor(
    private academic: AcademicService,
    private studentService: StudentService,
    private classroomService: ClassroomService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load everything immediately when the page opens.
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading = true;
    this.errorMessage = '';
    this.rows = [];
    this.filteredRows = [];
    this.students = [];
    this.classrooms = [];
    this.cdr.detectChanges();

    this.academic.departments().subscribe({
      next: departments => {
        this.departments = (departments ?? []).filter(d => d.active !== false);
        this.cdr.detectChanges();
        this.loadDepartments(0);
      },
      error: () => {
        this.errorMessage = 'Unable to load academic structure.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.studentService.getAll().subscribe({
      next: students => {
        this.students = students ?? [];
        this.recalculate();
        this.cdr.detectChanges();
      },
      error: () => this.recalculate()
    });

    this.classroomService.getAll().subscribe({
      next: classes => {
        this.classrooms = classes ?? [];
        this.recalculate();
        this.cdr.detectChanges();
      },
      error: () => this.recalculate()
    });
  }

  private loadDepartments(index: number): void {
    if (index >= this.departments.length) {
      this.finishLoad();
      return;
    }

    const department = this.departments[index];
    if (!department.id) {
      this.loadDepartments(index + 1);
      return;
    }

    this.academic.branches(department.id).subscribe({
      next: branches => this.loadBranches(department, (branches ?? []).filter(b => b.active !== false), 0, index),
      error: () => this.loadDepartments(index + 1)
    });
  }

  private loadBranches(
    department: AcademicDepartment,
    branches: AcademicBranch[],
    index: number,
    departmentIndex: number
  ): void {
    if (index >= branches.length) {
      this.loadDepartments(departmentIndex + 1);
      return;
    }

    const branch = branches[index];
    if (!branch.id) {
      this.loadBranches(department, branches, index + 1, departmentIndex);
      return;
    }

    this.academic.semesters(branch.id).subscribe({
      next: semesters => this.loadSemesters(
        department,
        branch,
        (semesters ?? []).filter(s => s.active !== false),
        0,
        branches,
        index,
        departmentIndex
      ),
      error: () => this.loadBranches(department, branches, index + 1, departmentIndex)
    });
  }

  private loadSemesters(
    department: AcademicDepartment,
    branch: AcademicBranch,
    semesters: AcademicSemester[],
    index: number,
    branches: AcademicBranch[],
    branchIndex: number,
    departmentIndex: number
  ): void {
    if (index >= semesters.length) {
      this.loadBranches(department, branches, branchIndex + 1, departmentIndex);
      return;
    }

    const semester = semesters[index];
    if (!semester.id) {
      this.loadSemesters(department, branch, semesters, index + 1, branches, branchIndex, departmentIndex);
      return;
    }

    this.academic.sections(semester.id).subscribe({
      next: sections => {
        for (const section of (sections ?? []).filter(s => s.active !== false)) {
          this.rows.push({
            department: department.name,
            branch: branch.name,
            branchCode: branch.code,
            semester: semester.name,
            semesterNumber: semester.semesterNumber,
            section: section.name,
            students: 0,
            activeStudents: 0,
            capacity: 0,
            classTeacher: 'Not Assigned',
            classTeacherSubject: ''
          });
        }

        // The app can receive HTTP callbacks outside Angular's normal
        // change-detection cycle. Render the newly loaded rows immediately.
        this.cdr.detectChanges();
        this.loadSemesters(department, branch, semesters, index + 1, branches, branchIndex, departmentIndex);
      },
      error: () => this.loadSemesters(department, branch, semesters, index + 1, branches, branchIndex, departmentIndex)
    });
  }

  private finishLoad(): void {
    this.recalculate();
    this.loading = false;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  private recalculate(): void {
    if (!this.rows.length) {
      this.applyFilters();
      return;
    }

    for (const row of this.rows) {
      const matchingClasses = this.classrooms.filter(c =>
        this.same(c.department, row.department) &&
        (this.same(c.branch, row.branch) || this.same(c.branch, row.branchCode)) &&
        Number(c.semester) === Number(row.semesterNumber) &&
        this.same(c.section, row.section)
      );

      const classRoom = matchingClasses[0];
      row.classId = classRoom?.id;
      row.capacity = classRoom?.capacity ?? 0;
      row.classTeacher = classRoom?.teacher
        ? `${classRoom.teacher.firstName ?? ''} ${classRoom.teacher.lastName ?? ''}`.trim() || 'Not Assigned'
        : 'Not Assigned';
      row.classTeacherSubject = classRoom?.teacher?.subject ?? '';

      const matchingStudents = this.students.filter(s => {
        const c = s.classRoom;
        if (!c) return false;

        if (row.classId != null && c.id != null) {
          return Number(c.id) === Number(row.classId);
        }

        return this.same(c.department, row.department) &&
          (this.same(c.branch, row.branch) || this.same(c.branch, row.branchCode)) &&
          Number(c.semester) === Number(row.semesterNumber) &&
          this.same(c.section, row.section);
      });

      row.students = matchingStudents.length;
      row.activeStudents = matchingStudents.filter(s => (s.status ?? 'ACTIVE') === 'ACTIVE').length;
    }

    this.applyFilters();
  }

  private same(a?: string, b?: string): boolean {
    return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
  }

  // Runs immediately for every select/input change.
  applyFilters(): void {
    const q = this.search.trim().toLowerCase();

    this.filteredRows = this.rows.filter(r =>
      (!this.selectedDepartment || r.department === this.selectedDepartment) &&
      (!this.selectedBranch || r.branch === this.selectedBranch) &&
      (!this.selectedSemester || String(r.semesterNumber) === this.selectedSemester) &&
      (!this.selectedSection || r.section === this.selectedSection) &&
      (!q || `${r.department} ${r.branch} ${r.semester} ${r.section} ${r.classTeacher}`.toLowerCase().includes(q))
    );

    // Stats always represent the currently visible/live scope.
    this.totalStudents = this.filteredRows.reduce((sum, r) => sum + r.students, 0);
    this.totalActive = this.filteredRows.reduce((sum, r) => sum + r.activeStudents, 0);
    this.totalCapacity = this.filteredRows.reduce((sum, r) => sum + r.capacity, 0);
  }

  get visibleDepartments(): number {
    return new Set(this.filteredRows.map(r => r.department)).size;
  }

  get branchesForFilter(): string[] {
    return [...new Set(
      this.rows
        .filter(r => !this.selectedDepartment || r.department === this.selectedDepartment)
        .map(r => r.branch)
    )].sort();
  }

  get semestersForFilter(): { number: number; name: string }[] {
    const map = new Map<number, string>();

    this.rows
      .filter(r =>
        (!this.selectedDepartment || r.department === this.selectedDepartment) &&
        (!this.selectedBranch || r.branch === this.selectedBranch)
      )
      .forEach(r => map.set(r.semesterNumber, r.semester));

    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([number, name]) => ({ number, name }));
  }

  get sectionsForFilter(): string[] {
    return [...new Set(
      this.rows
        .filter(r =>
          (!this.selectedDepartment || r.department === this.selectedDepartment) &&
          (!this.selectedBranch || r.branch === this.selectedBranch) &&
          (!this.selectedSemester || String(r.semesterNumber) === this.selectedSemester)
        )
        .map(r => r.section)
    )].sort();
  }

  onDepartmentChange(): void {
    this.selectedBranch = '';
    this.selectedSemester = '';
    this.selectedSection = '';
    this.applyFilters();
  }

  onBranchChange(): void {
    this.selectedSemester = '';
    this.selectedSection = '';
    this.applyFilters();
  }

  onSemesterChange(): void {
    this.selectedSection = '';
    this.applyFilters();
  }

  onSectionChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedDepartment = '';
    this.selectedBranch = '';
    this.selectedSemester = '';
    this.selectedSection = '';
    this.search = '';
    this.applyFilters();
  }

  refresh(): void {
    this.clearFilters();
    this.loadOverview();
  }

  trackByRow(_: number, row: SectionOverview): string {
    return `${row.department}|${row.branch}|${row.semesterNumber}|${row.section}`;
  }
}
