import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic.service';
import {
  AcademicDepartment,
  AcademicBranch,
  AcademicSemester,
  AcademicSection
} from '../../models/models';

@Component({
  selector: 'app-academic-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './academic-management.component.html',
  styleUrl: './academic-management.component.css'
})
export class AcademicManagementComponent implements OnInit {

  departments: AcademicDepartment[] = [];
  branches: AcademicBranch[] = [];
  semesters: AcademicSemester[] = [];
  sections: AcademicSection[] = [];

  selectedDepartmentId?: number;
  selectedBranchId?: number;
  selectedSemesterId?: number;

  // Loading states for real-time cascading dropdowns
  loadingDepartments = false;
  loadingBranches = false;
  loadingSemesters = false;
  loadingSections = false;

  departmentForm: AcademicDepartment = {
    name: '',
    code: '',
    active: true
  };

  branchForm: AcademicBranch = {
    name: '',
    code: '',
    department: {
      name: '',
      code: ''
    }
  };

  semesterForm: AcademicSemester = {
    semesterNumber: 1,
    name: '1st Semester',
    branch: {
      name: '',
      code: '',
      department: {
        name: '',
        code: ''
      }
    }
  };

  sectionForm: AcademicSection = {
    name: '',
    semester: {
      semesterNumber: 1,
      name: '',
      branch: {
        name: '',
        code: '',
        department: {
          name: '',
          code: ''
        }
      }
    }
  };

  editingDepartment?: number;
  editingBranch?: number;
  editingSemester?: number;
  editingSection?: number;

  busy = false;
  message = '';
  error = '';

  constructor(private academic: AcademicService) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  // =========================================================
  // DEPARTMENTS
  // =========================================================

  loadDepartments(attempt = 0): void {
    this.loadingDepartments = true;
    this.error = '';

    this.academic.departments().subscribe({
      next: (v: AcademicDepartment[] | any) => {

        this.departments = this.normalizeArray<AcademicDepartment>(v);

        this.loadingDepartments = false;

        // If there are no departments, clear everything below.
        if (!this.departments.length) {
          this.clearBranches();
          return;
        }

        // Keep current department if still available.
        if (
          this.selectedDepartmentId &&
          this.departments.some(
            d => Number(d.id) === Number(this.selectedDepartmentId)
          )
        ) {
          this.selectDepartment(this.selectedDepartmentId);
          return;
        }

        // Otherwise automatically select the first department.
        const firstDepartment = this.departments.find(d => d.id);

        if (firstDepartment?.id) {
          this.selectDepartment(Number(firstDepartment.id));
        }

      },

      error: e => {
        this.loadingDepartments = false;

        if (attempt < 3) {
          window.setTimeout(() => {
            this.loadDepartments(attempt + 1);
          }, 500);
          return;
        }

        this.fail(e);
      }
    });
  }

  selectDepartment(id: number | string | undefined): void {

    const departmentId = Number(id);

    // Invalid selection
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      this.selectedDepartmentId = undefined;
      this.clearBranches();
      return;
    }

    this.selectedDepartmentId = departmentId;

    // IMPORTANT:
    // Department change must immediately reset everything below it.
    this.selectedBranchId = undefined;
    this.selectedSemesterId = undefined;

    this.branches = [];
    this.semesters = [];
    this.sections = [];

    this.error = '';

    this.loadingBranches = true;

    console.log(
      '[Academic] Loading branches for department:',
      departmentId
    );

    this.academic.branches(departmentId).subscribe({

      next: (v: AcademicBranch[] | any) => {

        const branches = this.normalizeArray<AcademicBranch>(v);

        // Only active branches
        this.branches = branches.filter(
          b => b.active !== false
        );

        this.loadingBranches = false;

        console.log(
          '[Academic] Branches loaded:',
          this.branches
        );

        // Automatically select first branch if available.
        // This makes the whole hierarchy work immediately.
        if (this.branches.length) {

          const firstBranch = this.branches.find(b => b.id);

          if (firstBranch?.id) {
            this.selectBranch(Number(firstBranch.id));
          }

        }
      },

      error: e => {

        console.error(
          '[Academic] Branch loading failed:',
          e
        );

        this.loadingBranches = false;
        this.branches = [];

        this.fail(e);
      }
    });
  }

  private clearBranches(): void {
    this.branches = [];
    this.semesters = [];
    this.sections = [];

    this.selectedBranchId = undefined;
    this.selectedSemesterId = undefined;

    this.loadingBranches = false;
    this.loadingSemesters = false;
    this.loadingSections = false;
  }

  // =========================================================
  // BRANCHES
  // =========================================================

  selectBranch(id: number | string | undefined): void {

    const branchId = Number(id);

    if (!Number.isFinite(branchId) || branchId <= 0) {
      this.selectedBranchId = undefined;
      this.clearSemesters();
      return;
    }

    this.selectedBranchId = branchId;

    // Reset everything below branch.
    this.selectedSemesterId = undefined;

    this.semesters = [];
    this.sections = [];

    this.error = '';
    this.loadingSemesters = true;

    console.log(
      '[Academic] Loading semesters for branch:',
      branchId
    );

    this.academic.semesters(branchId).subscribe({

      next: (v: AcademicSemester[] | any) => {

        const semesters =
          this.normalizeArray<AcademicSemester>(v);

        this.semesters = semesters.filter(
          s => s.active !== false
        );

        this.loadingSemesters = false;

        console.log(
          '[Academic] Semesters loaded:',
          this.semesters
        );

        if (this.semesters.length) {

          const firstSemester =
            this.semesters.find(s => s.id);

          if (firstSemester?.id) {
            this.selectSemester(Number(firstSemester.id));
          }
        }
      },

      error: e => {

        console.error(
          '[Academic] Semester loading failed:',
          e
        );

        this.loadingSemesters = false;
        this.semesters = [];

        this.fail(e);
      }
    });
  }

  private clearSemesters(): void {

    this.semesters = [];
    this.sections = [];

    this.selectedSemesterId = undefined;

    this.loadingSemesters = false;
    this.loadingSections = false;
  }

  // =========================================================
  // SEMESTERS
  // =========================================================

  selectSemester(id: number | string | undefined): void {

    const semesterId = Number(id);

    if (!Number.isFinite(semesterId) || semesterId <= 0) {
      this.selectedSemesterId = undefined;
      this.sections = [];
      return;
    }

    this.selectedSemesterId = semesterId;

    this.sections = [];

    this.error = '';
    this.loadingSections = true;

    console.log(
      '[Academic] Loading sections for semester:',
      semesterId
    );

    this.academic.sections(semesterId).subscribe({

      next: (v: AcademicSection[] | any) => {

        const sections =
          this.normalizeArray<AcademicSection>(v);

        this.sections = sections.filter(
          s => s.active !== false
        );

        this.loadingSections = false;

        console.log(
          '[Academic] Sections loaded:',
          this.sections
        );
      },

      error: e => {

        console.error(
          '[Academic] Section loading failed:',
          e
        );

        this.loadingSections = false;
        this.sections = [];

        this.fail(e);
      }
    });
  }

  // =========================================================
  // DEPARTMENT CRUD
  // =========================================================

  saveDepartment(): void {

    this.error = '';

    const req = this.editingDepartment
      ? this.academic.updateDepartment(
          this.editingDepartment,
          this.departmentForm
        )
      : this.academic.createDepartment(
          this.departmentForm
        );

    req.subscribe({

      next: () => {

        this.resetDepartment();
        this.loadDepartments();

        this.ok('Department saved.');
      },

      error: e => this.fail(e)
    });
  }

  editDepartment(v: AcademicDepartment): void {

    this.editingDepartment = v.id;

    this.departmentForm = {
      ...v
    };
  }

  removeDepartment(v: AcademicDepartment): void {

    if (
      !v.id ||
      !confirm(`Remove ${v.name}?`)
    ) {
      return;
    }

    this.academic.deleteDepartment(v.id).subscribe({

      next: () => {

        if (
          Number(this.selectedDepartmentId) ===
          Number(v.id)
        ) {
          this.clearBranches();
        }

        this.loadDepartments();

        this.ok('Department removed.');
      },

      error: e => this.fail(e)
    });
  }

  resetDepartment(): void {

    this.editingDepartment = undefined;

    this.departmentForm = {
      name: '',
      code: '',
      active: true
    };
  }

  // =========================================================
  // BRANCH CRUD
  // =========================================================

  saveBranch(): void {

    if (!this.selectedDepartmentId) {
      this.error = 'Select a department first.';
      return;
    }

    const payload = {
      ...this.branchForm,

      department: {
        id: this.selectedDepartmentId,
        name: '',
        code: ''
      }
    } as AcademicBranch;

    const req = this.editingBranch
      ? this.academic.updateBranch(
          this.editingBranch,
          payload
        )
      : this.academic.createBranch(payload);

    req.subscribe({

      next: () => {

        this.resetBranch();

        // Reload branches immediately.
        this.selectDepartment(
          this.selectedDepartmentId!
        );

        this.ok('Branch saved.');
      },

      error: e => this.fail(e)
    });
  }

  editBranch(v: AcademicBranch): void {

    this.editingBranch = v.id;

    this.branchForm = {
      ...v
    };
  }

  removeBranch(v: AcademicBranch): void {

    if (
      !v.id ||
      !confirm(`Remove ${v.name}?`)
    ) {
      return;
    }

    this.academic.deleteBranch(v.id).subscribe({

      next: () => {

        this.selectDepartment(
          this.selectedDepartmentId!
        );

        this.ok('Branch removed.');
      },

      error: e => this.fail(e)
    });
  }

  resetBranch(): void {

    this.editingBranch = undefined;

    this.branchForm = {
      name: '',
      code: '',
      department: {
        name: '',
        code: ''
      }
    };
  }

  // =========================================================
  // SEMESTER CRUD
  // =========================================================

  saveSemester(): void {

    if (!this.selectedBranchId) {
      this.error = 'Select a branch first.';
      return;
    }

    const payload = {
      ...this.semesterForm,

      branch: {
        id: this.selectedBranchId,
        name: '',
        code: '',
        department: {
          name: '',
          code: ''
        }
      }
    } as AcademicSemester;

    const req = this.editingSemester
      ? this.academic.updateSemester(
          this.editingSemester,
          payload
        )
      : this.academic.createSemester(payload);

    req.subscribe({

      next: () => {

        this.resetSemester();

        this.selectBranch(
          this.selectedBranchId!
        );

        this.ok('Semester saved.');
      },

      error: e => this.fail(e)
    });
  }

  editSemester(v: AcademicSemester): void {

    this.editingSemester = v.id;

    this.semesterForm = {
      ...v
    };
  }

  removeSemester(v: AcademicSemester): void {

    if (
      !v.id ||
      !confirm(`Remove ${v.name}?`)
    ) {
      return;
    }

    this.academic.deleteSemester(v.id).subscribe({

      next: () => {

        this.selectBranch(
          this.selectedBranchId!
        );

        this.ok('Semester removed.');
      },

      error: e => this.fail(e)
    });
  }

  resetSemester(): void {

    this.editingSemester = undefined;

    this.semesterForm = {
      semesterNumber: 1,
      name: '1st Semester',
      branch: {
        name: '',
        code: '',
        department: {
          name: '',
          code: ''
        }
      }
    };
  }

  // =========================================================
  // SECTION CRUD
  // =========================================================

  saveSection(): void {

    if (!this.selectedSemesterId) {
      this.error = 'Select a semester first.';
      return;
    }

    const payload = {
      ...this.sectionForm,

      semester: {
        id: this.selectedSemesterId,
        semesterNumber: 1,
        name: '',
        branch: {
          name: '',
          code: '',
          department: {
            name: '',
            code: ''
          }
        }
      }
    } as AcademicSection;

    const req = this.editingSection
      ? this.academic.updateSection(
          this.editingSection,
          payload
        )
      : this.academic.createSection(payload);

    req.subscribe({

      next: () => {

        this.resetSection();

        this.selectSemester(
          this.selectedSemesterId!
        );

        this.ok('Section saved.');
      },

      error: e => this.fail(e)
    });
  }

  editSection(v: AcademicSection): void {

    this.editingSection = v.id;

    this.sectionForm = {
      ...v
    };
  }

  removeSection(v: AcademicSection): void {

    if (
      !v.id ||
      !confirm(`Remove ${v.name}?`)
    ) {
      return;
    }

    this.academic.deleteSection(v.id).subscribe({

      next: () => {

        this.selectSemester(
          this.selectedSemesterId!
        );

        this.ok('Section removed.');
      },

      error: e => this.fail(e)
    });
  }

  resetSection(): void {

    this.editingSection = undefined;

    this.sectionForm = {
      name: '',
      semester: {
        semesterNumber: 1,
        name: '',
        branch: {
          name: '',
          code: '',
          department: {
            name: '',
            code: ''
          }
        }
      }
    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private normalizeArray<T>(value: any): T[] {

    if (Array.isArray(value)) {
      return value;
    }

    // Supports common backend response wrappers too.
    if (Array.isArray(value?.content)) {
      return value.content;
    }

    if (Array.isArray(value?.data)) {
      return value.data;
    }

    if (Array.isArray(value?.items)) {
      return value.items;
    }

    return [];
  }

  private ok(m: string): void {

    this.error = '';
    this.message = m;

    window.setTimeout(() => {
      this.message = '';
    }, 2500);
  }

  private fail(e: any): void {

    console.error(
      '[Academic Management]',
      e
    );

    this.error =
      e?.error?.message ||
      e?.message ||
      'Operation failed. Backend check karein.';
  }
}