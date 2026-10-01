import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FeeService } from '../../services/fee.services';
import { StudentService } from '../../services/student.services';

import { Fee, Student } from '../../models/models';


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
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

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


        this.fees = (data ?? []).filter(fee =>
  fee.student?.classRoom?.grade === '5th Semester' &&
  (fee.student?.classRoom?.section === 'I1' ||
   fee.student?.classRoom?.section === 'I2')
);


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


        this.students = (data ?? []).filter(student =>
  student.classRoom?.grade === '5th Semester' &&
  (student.classRoom?.section === 'I1' ||
   student.classRoom?.section === 'I2')
);


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