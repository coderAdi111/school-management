import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic.service';
import { StudentService } from '../../services/student.services';
import { ClassroomService } from '../../services/classroom.services';
import { AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection, Student, ClassRoom } from '../../models/models';

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

  selectedDepartment = '';
  selectedBranch = '';
  selectedSemester = '';
  search = '';

  totalStudents = 0;
  totalActive = 0;
  totalCapacity = 0;

  private students: Student[] = [];
  private classrooms: ClassRoom[] = [];

  constructor(
    private academic: AcademicService,
    private studentService: StudentService,
    private classroomService: ClassroomService
  ) {}

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading = true;
    this.errorMessage = '';
    this.academic.departments().subscribe({
      next: departments => {
        this.departments = departments ?? [];
        this.loadDepartments(0);
      },
      error: () => {
        this.errorMessage = 'Unable to load academic structure.';
        this.loading = false;
      }
    });

    this.studentService.getAll().subscribe({
      next: students => {
        this.students = students ?? [];
        this.recalculate();
      },
      error: () => this.recalculate()
    });

    this.classroomService.getAll().subscribe({
      next: classes => {
        this.classrooms = classes ?? [];
        this.recalculate();
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
      next: branches => this.loadBranches(department, branches ?? [], 0, index),
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
      next: semesters => this.loadSemesters(department, branch, semesters ?? [], 0, branches, index, departmentIndex),
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
        for (const section of sections ?? []) {
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
        this.loadSemesters(department, branch, semesters, index + 1, branches, branchIndex, departmentIndex);
      },
      error: () => this.loadSemesters(department, branch, semesters, index + 1, branches, branchIndex, departmentIndex)
    });
  }

  private finishLoad(): void {
    this.recalculate();
    this.loading = false;
  }

  private recalculate(): void {
    if (!this.rows.length) return;

    for (const row of this.rows) {
      // A class may store the branch code (e.g. CS/IT) while the
      // academic overview displays the branch name (e.g. Computer Science).
      // Match both so imported students are counted in the correct section.
      const matchingClasses = this.classrooms.filter(c =>
        this.same(c.department, row.department) &&
        this.same(c.branch, row.branch) ||
        (this.same(c.department, row.department) &&
          this.same(c.branch, row.branchCode))
      ).filter(c =>
        Number(c.semester) === Number(row.semesterNumber) &&
        this.same(c.section, row.section)
      );

      const classRoom = matchingClasses[0];
      row.classId = classRoom?.id;
      row.capacity = classRoom?.capacity ?? 0;
      row.classTeacher = classRoom?.teacher
        ? `${classRoom.teacher.firstName} ${classRoom.teacher.lastName}`.trim()
        : 'Not Assigned';
      row.classTeacherSubject = classRoom?.teacher?.subject ?? '';

      const matchingStudents = this.students.filter(s => {
        const c = s.classRoom;
        if (!c) return false;

        // Prefer the actual class ID. This is the most reliable mapping
        // because students are assigned to a concrete ClassRoom during import.
        if (row.classId != null && c.id != null) {
          return Number(c.id) === Number(row.classId);
        }

        // Fallback for older records that may not have matching class IDs.
        return this.same(c.department, row.department) &&
          (this.same(c.branch, row.branch) || this.same(c.branch, row.branchCode)) &&
          Number(c.semester) === Number(row.semesterNumber) &&
          this.same(c.section, row.section);
      });

      row.students = matchingStudents.length;
      row.activeStudents = matchingStudents.filter(s => (s.status ?? 'ACTIVE') === 'ACTIVE').length;
    }

    this.totalStudents = this.rows.reduce((sum, r) => sum + r.students, 0);
    this.totalActive = this.rows.reduce((sum, r) => sum + r.activeStudents, 0);
    this.totalCapacity = this.rows.reduce((sum, r) => sum + r.capacity, 0);
    this.applyFilters();
  }

  private same(a?: string, b?: string): boolean {
    return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filteredRows = this.rows.filter(r =>
      (!this.selectedDepartment || r.department === this.selectedDepartment) &&
      (!this.selectedBranch || r.branch === this.selectedBranch) &&
      (!this.selectedSemester || String(r.semesterNumber) === this.selectedSemester) &&
      (!q || `${r.department} ${r.branch} ${r.semester} ${r.section}`.toLowerCase().includes(q))
    );
  }

  get branchesForFilter(): string[] {
    return [...new Set(this.rows
      .filter(r => !this.selectedDepartment || r.department === this.selectedDepartment)
      .map(r => r.branch))].sort();
  }

  get semestersForFilter(): { number: number; name: string }[] {
    const map = new Map<number, string>();
    this.rows
      .filter(r =>
        (!this.selectedDepartment || r.department === this.selectedDepartment) &&
        (!this.selectedBranch || r.branch === this.selectedBranch)
      )
      .forEach(r => map.set(r.semesterNumber, r.semester));
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([number, name]) => ({ number, name }));
  }

  onDepartmentChange(): void {
    this.selectedBranch = '';
    this.selectedSemester = '';
    this.applyFilters();
  }

  onBranchChange(): void {
    this.selectedSemester = '';
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedDepartment = '';
    this.selectedBranch = '';
    this.selectedSemester = '';
    this.search = '';
    this.applyFilters();
  }

  refresh(): void {
    this.rows = [];
    this.loadOverview();
  }

  trackByRow(_: number, row: SectionOverview): string {
    return `${row.department}|${row.branch}|${row.semesterNumber}|${row.section}`;
  }
}
