import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FeeService } from '../../services/fee.services';
import { StudentService } from '../../services/student.services';

import { Fee, Student } from '../../models/models';

@Component({
  selector: 'app-fee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fee-list.component.html',
  styleUrl: './fee-list.css'
})
export class FeeList implements OnInit {

  fees: Fee[] = [];
  students: Student[] = [];

  loading = false;
  saving = false;
  errorMessage = '';

  showForm = false;
  editing = false;

  selectedFeeId: number | null = null;

  formFee: Fee = this.emptyFee();

  constructor(
    private feeService: FeeService,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    this.loadFees();
    this.loadStudents();
  }

  // -------------------------
  // Load Fees
  // -------------------------
  loadFees(): void {

    this.loading = true;
    this.errorMessage = '';

    this.feeService.getAll().subscribe({
      next: (data: Fee[]) => {
        this.fees = data;
        this.loading = false;
      },

      error: (error) => {
        console.error('Error loading fees:', error);
        this.loading = false;
        this.errorMessage = 'Unable to load fees.';
      }
    });
  }

  // -------------------------
  // Load Students
  // -------------------------
  loadStudents(): void {

    this.studentService.getAll().subscribe({
      next: (data: Student[]) => {
        this.students = data;
      },

      error: (error) => {
        console.error('Error loading students:', error);
      }
    });
  }

  // -------------------------
  // Empty Fee
  // -------------------------
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

  // -------------------------
  // Open Add Form
  // -------------------------
  openAddForm(): void {

    this.editing = false;
    this.selectedFeeId = null;

    this.formFee = this.emptyFee();

    this.showForm = true;
  }

  // -------------------------
  // Open Edit Form
  // -------------------------
  openEditForm(fee: Fee): void {

    this.editing = true;
    this.selectedFeeId = fee.id ?? null;

    this.formFee = {
      ...fee,
      student: fee.student
        ? { ...fee.student }
        : undefined
    };

    this.showForm = true;
  }

  // -------------------------
  // Close Form
  // -------------------------
  closeForm(): void {

    this.showForm = false;
    this.editing = false;
    this.selectedFeeId = null;

    this.formFee = this.emptyFee();
  }

  // -------------------------
  // Student Change
  // -------------------------
  onStudentChange(event: Event): void {

    const value = (event.target as HTMLSelectElement).value;

    if (!value) {
      this.formFee.student = undefined;
      return;
    }

    const studentId = Number(value);

    const selectedStudent = this.students.find(
      student => student.id === studentId
    );

    this.formFee.student = selectedStudent;
  }

  // -------------------------
  // Save Fee
  // -------------------------
  saveFee(): void {

    if (!this.formFee.student?.id) {
      alert('Please select a student.');
      return;
    }

    if (!this.formFee.feeType?.trim()) {
      alert('Please enter fee type.');
      return;
    }

    if (!this.formFee.amount || this.formFee.amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!this.formFee.dueDate) {
      alert('Please select due date.');
      return;
    }

    this.saving = true;

    const feeToSave: Fee = {
      ...this.formFee,
      student: {
        id: this.formFee.student.id,
        firstName: this.formFee.student.firstName,
        lastName: this.formFee.student.lastName,
        email: this.formFee.student.email
      }
    };

    if (this.editing && this.selectedFeeId !== null) {

      this.feeService.update(
        this.selectedFeeId,
        feeToSave
      ).subscribe({

        next: () => {
  alert('Fee updated successfully!');

  window.location.reload();
},

        error: (error) => {
          console.error('Error updating fee:', error);

          this.saving = false;

          alert('Failed to update fee.');
        }
      });

    } else {

      this.feeService.create(feeToSave).subscribe({

        next: () => {
  alert('Fee added successfully!');

  window.location.reload();
},

        error: (error) => {
          console.error('Error creating fee:', error);

          this.saving = false;

          alert('Failed to add fee.');
        }
      });
    }
  }

  // -------------------------
  // Delete Fee
  // -------------------------
  deleteFee(fee: Fee): void {

    if (!fee.id) {
      return;
    }

    const studentName =
      `${fee.student?.firstName ?? ''} ${fee.student?.lastName ?? ''}`.trim();

    const confirmed = confirm(
      `Delete fee for ${studentName || 'this student'}?`
    );

    if (!confirmed) {
      return;
    }

    this.feeService.delete(fee.id).subscribe({

     next: () => {
  alert('Fee deleted successfully!');

  window.location.reload();
},

      error: (error) => {
        console.error('Error deleting fee:', error);
        alert('Failed to delete fee.');
      }
    });
  }
}