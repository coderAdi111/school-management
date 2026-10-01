import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ClassroomService } from '../../services/classroom.services';
import { TeacherService } from '../../services/teacher.services';

import {
  ClassRoom,
  Teacher
} from '../../models/models';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './class-list.html',
  styleUrl: './class-list.css'
})
export class ClassList implements OnInit {

  classes: ClassRoom[] = [];

  teachers: Teacher[] = [];

  loading = false;
  loadingTeachers = false;
  saving = false;

  errorMessage = '';

  showForm = false;
  editing = false;

  selectedClassId: number | null = null;

  formClass: ClassRoom = this.emptyClass();

  constructor(
    private classroomService: ClassroomService,
    private teacherService: TeacherService,
    private cdr: ChangeDetectorRef
  ) {}

  // =========================
  // COMPONENT INIT
  // =========================

  ngOnInit(): void {

  console.log(
    'CLASS LIST COMPONENT ngOnInit RUNNING'
  );

  this.loadClasses();
  this.loadTeachers();
}

  // =========================
  // EMPTY CLASS
  // =========================

  emptyClass(): ClassRoom {
    return {
      name: '',
      grade: '',
      section: '',
      teacher: undefined,
      capacity: 30
    };
  }

  // =========================
  // LOAD CLASSES
  // =========================

  loadClasses(): void {

    console.log(
      'loadClasses() started'
    );

    this.loading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    this.classroomService.getAll().subscribe({

      next: (data: ClassRoom[]) => {

        console.log(
          'Classes loaded:',
          data
        );

        this.classes = (data ?? []).filter(c => c.grade === '5th Semester' && (c.section === 'I1' || c.section === 'I2'));

        this.loading = false;

        this.cdr.detectChanges();

        console.log(
          'Classes loading finished.'
        );
      },

      error: (error: any) => {

        console.error(
          'Class loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Unable to load classes. Is Spring Boot running?';

        this.cdr.detectChanges();
      }

    });
  }

  // =========================
  // LOAD TEACHERS
  // =========================

  loadTeachers(): void {

    console.log(
      'loadTeachers() started'
    );

    this.loadingTeachers = true;

    this.teacherService.getAll().subscribe({

      next: (data: Teacher[]) => {

        console.log(
          'Teachers for class:',
          data
        );

        this.teachers = data ?? [];

        this.loadingTeachers = false;

        this.cdr.detectChanges();

        console.log(
          'Teachers loading finished.'
        );
      },

      error: (error: any) => {

        console.error(
          'Teacher loading error:',
          error
        );

        this.loadingTeachers = false;

        this.errorMessage =
          'Unable to load teachers.';

        this.cdr.detectChanges();
      }

    });
  }

  // =========================
  // ADD FORM
  // =========================

  openAddForm(): void {

    this.editing = false;

    this.selectedClassId = null;

    this.formClass =
      this.emptyClass();

    this.showForm = true;

    this.cdr.detectChanges();
  }

  // =========================
  // EDIT FORM
  // =========================

  openEditForm(
    classRoom: ClassRoom
  ): void {

    this.editing = true;

    this.selectedClassId =
      classRoom.id ?? null;

    this.formClass = {
      name: classRoom.name,
      grade: classRoom.grade,
      section: classRoom.section ?? '',
      teacher: classRoom.teacher
        ? { ...classRoom.teacher }
        : undefined,
      capacity: classRoom.capacity ?? 30
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

    this.selectedClassId = null;

    this.formClass =
      this.emptyClass();

    this.saving = false;

    this.cdr.detectChanges();
  }

  // =========================
  // SELECT TEACHER
  // =========================

  selectTeacher(
    teacherId: string | number
  ): void {

    const id = Number(teacherId);

    if (!id) {

      this.formClass.teacher =
        undefined;

      return;
    }

    const teacher =
      this.teachers.find(
        t => t.id === id
      );

    if (teacher) {

      this.formClass.teacher = {
        ...teacher
      };

      console.log(
        'Selected teacher:',
        teacher
      );
    }

    this.cdr.detectChanges();
  }

  // =========================
  // SAVE CLASS
  // =========================

  saveClass(): void {

    // CLASS NAME
    if (!this.formClass.name?.trim()) {

      alert(
        'Please enter class name.'
      );

      return;
    }

    // GRADE
    if (!this.formClass.grade?.trim()) {

      alert(
        'Please enter grade.'
      );

      return;
    }

    // CAPACITY
    if (
      !this.formClass.capacity ||
      this.formClass.capacity <= 0
    ) {

      alert(
        'Please enter a valid capacity.'
      );

      return;
    }

    // TEACHER
    if (!this.formClass.teacher?.id) {

      alert(
        'Please select a teacher.'
      );

      return;
    }

    this.saving = true;

    const teacherId =
      this.formClass.teacher.id;

    const classToSave: ClassRoom = {

      name:
        this.formClass.name.trim(),

      grade:
        this.formClass.grade.trim(),

      section:
        this.formClass.section?.trim() || '',

      teacher: {
        id: teacherId,
        firstName: '',
        lastName: ''
      },

      capacity:
        Number(this.formClass.capacity)
    };

    console.log(
      'Saving class:',
      classToSave
    );

    // =========================
    // UPDATE
    // =========================

    if (
      this.editing &&
      this.selectedClassId !== null
    ) {

      this.classroomService.update(
        this.selectedClassId,
        classToSave
      ).subscribe({

        next: (updatedClass) => {

          console.log(
            'Class updated:',
            updatedClass
          );

          alert(
            'Class updated successfully!'
          );

          this.closeForm();

          this.loadClasses();
        },

        error: (error: any) => {

          console.error(
            'Class update error:',
            error
          );

          this.saving = false;

          alert(
            'Failed to update class.'
          );

          this.cdr.detectChanges();
        }

      });

      return;
    }

    // =========================
    // CREATE
    // =========================

    this.classroomService
      .create(classToSave)
      .subscribe({

        next: (createdClass) => {

          console.log(
            'Class created:',
            createdClass
          );

          alert(
            'Class added successfully!'
          );

          this.closeForm();

          this.loadClasses();
        },

        error: (error: any) => {

          console.error(
            'Class create error:',
            error
          );

          this.saving = false;

          alert(
            'Failed to add class.'
          );

          this.cdr.detectChanges();
        }

      });
  }

  // =========================
  // DELETE CLASS
  // =========================

  deleteClass(
    classRoom: ClassRoom
  ): void {

    if (!classRoom.id) {

      return;
    }

    const confirmed =
      confirm(
        `Delete "${classRoom.name}"?`
      );

    if (!confirmed) {

      return;
    }

    this.classroomService
      .delete(classRoom.id)
      .subscribe({

        next: () => {

          console.log(
            'Class deleted:',
            classRoom.id
          );

          alert(
            'Class deleted successfully!'
          );

          this.classes =
            this.classes.filter(
              c => c.id !== classRoom.id
            );

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'Class delete error:',
            error
          );

          alert(
            'Failed to delete class. ' +
            'Students may be assigned to this class.'
          );
        }

      });
  }

  // =========================
  // TEACHER NAME
  // =========================

  getTeacherName(
    teacher?: Teacher
  ): string {

    if (!teacher) {

      return 'Not Assigned';
    }

    return `${teacher.firstName} ${teacher.lastName}`;
  }

}