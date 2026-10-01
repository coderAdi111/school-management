import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { StudentService } from '../../services/student.services';

import { Student } from '../../models/models';


@Component({
  selector: 'app-student-list',
  standalone: true,

  imports: [
    CommonModule,
    RouterModule
  ],

  templateUrl: './student-list.component.html',

  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {

  // =========================
  // STUDENTS
  // =========================

  students: Student[] = [];


  // =========================
  // SEARCH
  // =========================

  searchTerm = '';


  // =========================
  // LOADING
  // =========================

  loading = false;


  // =========================
  // ERROR
  // =========================

  errorMsg = '';


  constructor(
    private studentService: StudentService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadStudents();

  }


  // =========================
  // LOAD STUDENTS
  // =========================

  loadStudents(): void {

    this.loading = true;

    this.errorMsg = '';

    this.cdr.detectChanges();


    this.studentService
      .getAll()
      .subscribe({

        next: (data: Student[]) => {

          console.log(
            'Students loaded:',
            data
          );

          this.students =
            (data ?? []).filter(s =>
              s.classRoom?.grade === '5th Semester' &&
              (s.classRoom?.section === 'I1' || s.classRoom?.section === 'I2')
            );

          this.loading = false;

          this.cdr.detectChanges();

        },

        error: (err: any) => {

          console.error(
            'Student load error:',
            err
          );

          this.loading = false;

          this.errorMsg =
            'Failed to load students. Is Spring Boot running?';

          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // SEARCH
  // =========================

  search(): void {

    const term =
      this.searchTerm.trim();


    if (!term) {

      this.loadStudents();

      return;

    }


    this.loading = true;

    this.errorMsg = '';

    this.cdr.detectChanges();


    this.studentService
      .search(term)
      .subscribe({

        next: (data: Student[]) => {

          console.log(
            'Students search result:',
            data
          );

          this.students =
            (data ?? []).filter(s =>
              s.classRoom?.grade === '5th Semester' &&
              (s.classRoom?.section === 'I1' || s.classRoom?.section === 'I2')
            );

          this.loading = false;

          this.cdr.detectChanges();

        },

        error: (err: any) => {

          console.error(
            'Student search error:',
            err
          );

          this.loading = false;

          this.errorMsg =
            'Failed to search students.';

          this.cdr.detectChanges();

        }

      });

  }


  // =========================
  // DELETE
  // =========================

  deleteStudent(id: number): void {

    if (
      !confirm(
        'Delete this student? This cannot be undone.'
      )
    ) {

      return;

    }


    this.studentService
      .delete(id)
      .subscribe({

        next: () => {

          this.students =
            this.students.filter(
              student =>
                student.id !== id
            );

          this.cdr.detectChanges();

        },

        error: (err: any) => {

          console.error(
            'Delete student error:',
            err
          );

          this.errorMsg =
            'Failed to delete student.';

          this.cdr.detectChanges();

        }

      });

  }

}