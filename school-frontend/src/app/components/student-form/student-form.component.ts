import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // ================================
  // INIT
  // ================================

  ngOnInit(): void {

    this.loadClasses();

    const id =
      this.route.snapshot.paramMap.get('id');

    if (id) {

      this.editing = true;

      this.studentId = Number(id);

      console.log(
        'Edit student ID:',
        this.studentId
      );

      this.loadStudent(
        this.studentId
      );
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

    this.cdr.detectChanges();

    console.log(
      'Loading classes for student form...'
    );


    this.classroomService
      .getAll()
      .subscribe({

        next: (data: ClassRoom[]) => {

          console.log(
            'Classes loaded:',
            data
          );

          this.classes =
            data ?? [];

          this.loadingClasses = false;

          this.cdr.detectChanges();
        },


        error: (error: any) => {

          console.error(
            'Error loading classes:',
            error
          );

          this.loadingClasses = false;

          this.errorMessage =
            'Unable to load classes.';

          this.cdr.detectChanges();
        }

      });
  }


  // ================================
  // LOAD STUDENT FOR EDIT
  // ================================

  loadStudent(id: number): void {

    this.loading = true;

    this.errorMessage = '';

    console.log(
      'Loading student ID:',
      id
    );

    this.cdr.detectChanges();


    this.studentService
      .getById(id)
      .subscribe({

        next: (data: Student) => {

          console.log(
            'Student loaded:',
            data
          );

          this.student = {
            ...data
          };

          this.loading = false;

          this.errorMessage = '';

          console.log(
            'Student loading:',
            this.loading
          );

          this.cdr.detectChanges();
        },


        error: (error: any) => {

          console.error(
            'Error loading student:',
            error
          );

          this.loading = false;

          this.errorMessage =
            'Unable to load student.';

          this.cdr.detectChanges();
        }

      });
  }


  // ================================
  // CLASS CHANGE
  // ================================

  selectClass(
    classId: string | number
  ): void {

    const id =
      Number(classId);

    if (!id) {

      this.student.classRoom =
        undefined;

      this.cdr.detectChanges();

      return;
    }


    const selectedClass =
      this.classes.find(
        c => c.id === id
      );


    if (selectedClass) {

      this.student.classRoom = {
        ...selectedClass
      };

      console.log(
        'Selected class:',
        selectedClass
      );

      this.cdr.detectChanges();
    }
  }


  // ================================
  // SAVE STUDENT
  // ================================

  saveStudent(): void {

    if (!this.student.firstName?.trim()) {

      alert(
        'Please enter first name.'
      );

      return;
    }


    if (!this.student.lastName?.trim()) {

      alert(
        'Please enter last name.'
      );

      return;
    }


    if (!this.student.email?.trim()) {

      alert(
        'Please enter email.'
      );

      return;
    }


    if (!this.student.classRoom?.id) {

      alert(
        'Please select a class.'
      );

      return;
    }


    this.saving = true;

    this.errorMessage = '';

    this.cdr.detectChanges();


    const classId =
      this.student.classRoom.id;


    // ================================
    // STUDENT TO SAVE
    // ================================

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


    console.log(
      'Student to save:',
      studentToSave
    );


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

            console.log(
              'Student updated successfully.'
            );

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

            this.cdr.detectChanges();

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

        next: (
          createdStudent: Student
        ) => {

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

          this.cdr.detectChanges();


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