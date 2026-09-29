import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { StudentService } from '../../services/student.services';
import { ClassroomService } from '../../services/classroom.services';

import {
  Student,
  ClassRoom
} from '../../models/models';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './student-form.component.html',
  styleUrl: './student-form.component.css'
})
export class StudentFormComponent implements OnInit {

  editing = false;
  studentId: number | null = null;

  saving = false;
  loading = false;
  loadingClasses = false;

  errorMessage = '';

  classes: ClassRoom[] = [];

  student: Student = this.emptyStudent();

  constructor(
    private studentService: StudentService,
    private classroomService: ClassroomService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    // Load classes for dropdown
    this.loadClasses();

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.editing = true;
      this.studentId = Number(id);
      this.loadStudent(this.studentId);
    }
  }


  // ================================
  // EMPTY STUDENT
  // ================================

  emptyStudent(): Student {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      address: '',
      enrollmentDate: '',
      status: 'ACTIVE',
      classRoom: undefined
    };
  }


  // ================================
  // LOAD CLASSES
  // ================================

  loadClasses(): void {

    this.loadingClasses = true;

    this.classroomService.getAll().subscribe({

      next: (data: ClassRoom[]) => {

        console.log('Classes loaded:', data);

        this.classes = data ?? [];

        this.loadingClasses = false;
      },

      error: (error: any) => {

        console.error(
          'Error loading classes:',
          error
        );

        this.loadingClasses = false;

        this.errorMessage =
          'Unable to load classes.';
      }

    });
  }


  // ================================
  // LOAD STUDENT FOR EDIT
  // ================================

  loadStudent(id: number): void {

    this.loading = true;
    this.errorMessage = '';

    this.studentService.getById(id).subscribe({

      next: (data: Student) => {

        this.student = {
          ...data
        };

        this.loading = false;
      },

      error: (error: any) => {

        console.error(
          'Error loading student:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load student.';
      }

    });
  }


  // ================================
  // CLASS CHANGE
  // ================================

  selectClass(classId: string | number): void {

    const id = Number(classId);

    if (!id) {

      this.student.classRoom = undefined;

      return;
    }

    const selectedClass =
      this.classes.find(c => c.id === id);

    if (selectedClass) {

      this.student.classRoom = {
        ...selectedClass
      };

      console.log(
        'Selected class:',
        selectedClass
      );
    }
  }


  // ================================
  // SAVE STUDENT
  // ================================

  saveStudent(): void {

    if (!this.student.firstName?.trim()) {

      alert('Please enter first name.');

      return;
    }

    if (!this.student.lastName?.trim()) {

      alert('Please enter last name.');

      return;
    }

    if (!this.student.email?.trim()) {

      alert('Please enter email.');

      return;
    }

    if (!this.student.classRoom?.id) {

      alert('Please select a class.');

      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const classId =
      this.student.classRoom.id;


    // Only send class ID to backend
    const studentToSave: Student = {

      ...this.student,

      firstName:
        this.student.firstName.trim(),

      lastName:
        this.student.lastName.trim(),

      email:
        this.student.email.trim(),

      phone:
        this.student.phone?.trim() || '',

      address:
        this.student.address?.trim() || '',

      classRoom: {
        id: classId,

        name:
          this.student.classRoom.name,

        grade:
          this.student.classRoom.grade,

        section:
          this.student.classRoom.section,

        teacher:
          this.student.classRoom.teacher,

        capacity:
          this.student.classRoom.capacity
      }
    };


    // ================================
    // UPDATE
    // ================================

    if (
      this.editing &&
      this.studentId !== null
    ) {

      this.studentService
        .update(
          this.studentId,
          studentToSave
        )
        .subscribe({

          next: () => {

            alert(
              'Student updated successfully!'
            );

            this.router.navigate([
              '/students'
            ]);
          },

          error: (error: any) => {

            console.error(
              'Error updating student:',
              error
            );

            this.saving = false;

            alert(
              'Failed to update student.'
            );
          }

        });

      return;
    }


    // ================================
    // CREATE
    // ================================

    this.studentService
      .create(studentToSave)
      .subscribe({

        next: (createdStudent: Student) => {

          console.log(
            'Student created:',
            createdStudent
          );

          alert(
            'Student added successfully!'
          );

          this.router.navigate([
            '/students'
          ]);
        },

        error: (error: any) => {

          console.error(
            'Error creating student:',
            error
          );

          this.saving = false;

          if (
            error?.status === 409
          ) {

            alert(
              'This email is already registered.'
            );

          } else {

            alert(
              'Failed to add student.'
            );
          }

        }

      });
  }


  // ================================
  // CANCEL
  // ================================

  cancel(): void {

    this.router.navigate([
      '/students'
    ]);
  }

}