import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FeeService } from '../../services/fee.services';
import { StudentService } from '../../services/student.services';
import { AcademicService } from '../../services/academic.service';

import { Fee, Student, ClassRoom, AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection } from '../../models/models';


@Component({
  selector: 'app-fee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './fee-list.component.html',
  styleUrl: './fee-list.css'
})
export class FeeList implements OnInit {

  // =========================
  // DATA
  // =========================

  fees: Fee[] = [];

  students: Student[] = [];

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


  // =========================
  // LOADING / ERROR
  // =========================

  loading = false;

  saving = false;

  errorMessage = '';


  // =========================
  // FORM
  // =========================

  showForm = false;

  editing = false;

  selectedFeeId: number | null = null;

  formFee: Fee = this.emptyFee();


  // =========================
  // CONSTRUCTOR
  // =========================

  constructor(
    private feeService: FeeService,
    private studentService: StudentService,
    private academicService: AcademicService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadAcademicFilters();

    this.loadFees();

    this.loadStudents();

  }


  // =========================
  // LOAD FEES
  // =========================

  loadFees(): void {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    this.feeService.getAll().subscribe({

      // SUCCESS
      next: (data: Fee[]) => {

        console.log(
          'FEES DATA RECEIVED:',
          data
        );


        this.fees = data ?? [];
        this.applyAcademicFilters();


        this.loading = false;

        this.errorMessage = '';


        console.log(
          'FEES ARRAY:',
          this.fees
        );

        console.log(
          'LOADING:',
          this.loading
        );


        // Force UI update
        this.cdr.detectChanges();

      },


      // ERROR
      error: (error: any) => {

        console.error(
          'ERROR LOADING FEES:',
          error
        );


        this.loading = false;

        this.errorMessage =
          'Unable to load fees.';


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
          'Students loaded for fees:',
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
      String(cls.section ?? '').trim().toLowerCase() === String(section.name ?? '').trim().toLowerCase() ||
      String(cls.section ?? '').trim().toLowerCase() === String((section as any).code ?? '').trim().toLowerCase();

    return deptMatch && branchMatch && semesterMatch && sectionMatch;
  }

  applyAcademicFilters(): void {
    this.filteredStudents = (this.students ?? []).filter(s =>
      this.classMatchesAcademic(s.classRoom)
    );

    // Keep the add/edit dropdown scoped to the selected academic hierarchy.
    if (this.formFee && this.formFee.student?.id) {
      const selected = this.students.find(s => s.id === this.formFee.student?.id);
      if (selected && !this.classMatchesAcademic(selected.classRoom)) {
        this.formFee.student = undefined;
      }
    }
  }

  get filteredFees(): Fee[] {
    return (this.fees ?? []).filter(f =>
      this.classMatchesAcademic(f.student?.classRoom)
    );
  }

  // =========================
  // EMPTY FEE
  // =========================

  emptyFee(): Fee {

    return {

      student: undefined,

      feeType: '',

      amount: 0,

      dueDate: '',

      status: 'PENDING',

      paidDate: '',

      remarks: ''

    };

  }


  // =========================
  // OPEN ADD FORM
  // =========================

  openAddForm(): void {

    this.editing = false;

    this.selectedFeeId = null;

    this.formFee = this.emptyFee();

    this.showForm = true;

  }


  // =========================
  // OPEN EDIT FORM
  // =========================

  openEditForm(
    fee: Fee
  ): void {

    this.editing = true;

    this.selectedFeeId =
      fee.id ?? null;


    this.formFee = {

      ...fee,

      student: fee.student
        ? { ...fee.student }
        : undefined

    };


    this.showForm = true;

  }


  // =========================
  // CLOSE FORM
  // =========================

  closeForm(): void {

    this.showForm = false;

    this.editing = false;

    this.selectedFeeId = null;

    this.formFee = this.emptyFee();

    this.saving = false;

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

      this.formFee.student =
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


    this.formFee.student =
      selectedStudent;

  }


  // =========================
  // SAVE FEE
  // =========================

  saveFee(): void {

    // Student validation
    if (!this.formFee.student?.id) {

      alert(
        'Please select a student.'
      );

      return;

    }


    // Fee type validation
    if (!this.formFee.feeType?.trim()) {

      alert(
        'Please enter fee type.'
      );

      return;

    }


    // Amount validation
    if (
      !this.formFee.amount ||
      this.formFee.amount <= 0
    ) {

      alert(
        'Please enter a valid amount.'
      );

      return;

    }


    // Due date validation
    if (!this.formFee.dueDate) {

      alert(
        'Please select due date.'
      );

      return;

    }


    this.saving = true;


    const feeToSave: Fee = {

      ...this.formFee,

      student: {

        id:
          this.formFee.student.id,

        firstName:
          this.formFee.student.firstName,

        lastName:
          this.formFee.student.lastName,

        email:
          this.formFee.student.email

      }

    };


    // =========================
    // UPDATE
    // =========================

    if (
      this.editing &&
      this.selectedFeeId !== null
    ) {

      this.feeService
        .update(
          this.selectedFeeId,
          feeToSave
        )
        .subscribe({

          next: () => {

            alert(
              'Fee updated successfully!'
            );


            window.location.reload();

          },


          error: (error: any) => {

            console.error(
              'Error updating fee:',
              error
            );


            this.saving = false;


            alert(
              'Failed to update fee.'
            );

          }

        });


      return;

    }


    // =========================
    // CREATE
    // =========================

    this.feeService
      .create(feeToSave)
      .subscribe({

        next: () => {

          alert(
            'Fee added successfully!'
          );


          window.location.reload();

        },


        error: (error: any) => {

          console.error(
            'Error creating fee:',
            error
          );


          this.saving = false;


          alert(
            'Failed to add fee.'
          );

        }

      });

  }


  // =========================
  // DELETE FEE
  // =========================

  deleteFee(
    fee: Fee
  ): void {

    if (!fee.id) {

      return;

    }


    const studentName =

      `${fee.student?.firstName ?? ''} ` +
      `${fee.student?.lastName ?? ''}`.trim();


    const confirmed =
      confirm(
        `Delete fee for ${
          studentName || 'this student'
        }?`
      );


    if (!confirmed) {

      return;

    }


    this.feeService
      .delete(fee.id)
      .subscribe({

        next: () => {

          alert(
            'Fee deleted successfully!'
          );


          window.location.reload();

        },


        error: (error: any) => {

          console.error(
            'Error deleting fee:',
            error
          );


          alert(
            'Failed to delete fee.'
          );

        }

      });

  }

}