import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TeacherService } from '../../services/teacher.services';
import { Teacher } from '../../models/models';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './teacher-list.html',
  styleUrl: './teacher-list.css'
})
export class TeacherListComponent implements OnInit {

  teachers: Teacher[] = [];

  searchTerm = '';

  loading = false;
  saving = false;

  errorMessage = '';

  showForm = false;
  editing = false;

  selectedTeacherId: number | null = null;

  formTeacher: Teacher = this.emptyTeacher();

  constructor(
    private teacherService: TeacherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  // =========================
  // EMPTY TEACHER
  // =========================

  emptyTeacher(): Teacher {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      subject: '',
      qualification: '',
      status: 'ACTIVE'
    };
  }

  // =========================
  // LOAD TEACHERS
  // =========================

  private isCurrentTimetableTeacher(teacher: Teacher): boolean {

    const allowed = new Set([
      'Shikha Gupta',
      'Deepak Gupta',
      'Rakesh Rathi',
      'Bhanupriya Sharma',
      'Avinash Bhandiya',
      'Sammah Rasheed',
      'Monica Sharma',
      'Mangi Lal',
      'Satya Narayan Tazi'
    ]);

    const name =
      `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`
        .trim()
        .replace(/\s+/g, ' ');

    return allowed.has(name);
  }

  private filterCurrentTeachers(data: Teacher[]): Teacher[] {
    return (data ?? []).filter(teacher =>
      teacher.status !== 'INACTIVE' &&
      this.isCurrentTimetableTeacher(teacher)
    );
  }

  loadTeachers(): void {

    this.loading = true;
    this.errorMessage = '';

    this.teacherService.getAll().subscribe({

      next: (data: Teacher[]) => {

        console.log('Teachers loaded:', data);

        this.teachers = this.filterCurrentTeachers(data);

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'Teacher loading error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Failed to load teachers. Is Spring Boot running?';

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
      this.loadTeachers();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.teacherService.search(term).subscribe({

      next: (data: Teacher[]) => {

        console.log(
          'Teacher search result:',
          data
        );

        this.teachers = this.filterCurrentTeachers(data);

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        console.error(
          'Teacher search error:',
          error
        );

        this.loading = false;

        this.errorMessage =
          'Failed to search teachers.';

        this.cdr.detectChanges();
      }

    });
  }

  // =========================
  // OPEN ADD FORM
  // =========================

  openAddForm(): void {

    this.editing = false;

    this.selectedTeacherId = null;

    this.formTeacher =
      this.emptyTeacher();

    this.showForm = true;
  }

  // =========================
  // OPEN EDIT FORM
  // =========================

  openEditForm(
    teacher: Teacher
  ): void {

    this.editing = true;

    this.selectedTeacherId =
      teacher.id ?? null;

    this.formTeacher = {
      ...teacher
    };

    this.showForm = true;
  }

  // =========================
  // CLOSE FORM
  // =========================

  closeForm(): void {

    this.showForm = false;

    this.editing = false;

    this.selectedTeacherId = null;

    this.formTeacher =
      this.emptyTeacher();

    this.saving = false;
  }

  // =========================
  // SAVE TEACHER
  // =========================

  saveTeacher(): void {

    if (
      !this.formTeacher.firstName?.trim()
    ) {
      alert('Please enter first name.');
      return;
    }

    if (
      !this.formTeacher.lastName?.trim()
    ) {
      alert('Please enter last name.');
      return;
    }

    this.saving = true;

    const teacherToSave: Teacher = {

      ...this.formTeacher,

      firstName:
        this.formTeacher.firstName.trim(),

      lastName:
        this.formTeacher.lastName.trim(),

      email:
        this.formTeacher.email?.trim() || '',

      phone:
        this.formTeacher.phone?.trim() || '',

      subject:
        this.formTeacher.subject?.trim() || '',

      qualification:
        this.formTeacher.qualification?.trim() || '',

      status:
        this.formTeacher.status || 'ACTIVE'
    };

    // UPDATE
    if (
      this.editing &&
      this.selectedTeacherId !== null
    ) {

      this.teacherService.update(
        this.selectedTeacherId,
        teacherToSave
      ).subscribe({

        next: () => {

          alert(
            'Teacher updated successfully!'
          );

          this.closeForm();

          this.loadTeachers();
        },

        error: (error: any) => {

          console.error(
            'Teacher update error:',
            error
          );

          this.saving = false;

          alert(
            'Failed to update teacher.'
          );
        }

      });

      return;
    }

    // CREATE
    this.teacherService
      .create(teacherToSave)
      .subscribe({

        next: () => {

          alert(
            'Teacher added successfully!'
          );

          this.closeForm();

          this.loadTeachers();
        },

        error: (error: any) => {

          console.error(
            'Teacher create error:',
            error
          );

          this.saving = false;

          alert(
            'Failed to add teacher.'
          );
        }

      });
  }

  // =========================
  // DELETE
  // =========================

  deleteTeacher(
    teacher: Teacher
  ): void {

    if (!teacher.id) {
      return;
    }

    const name =
      `${teacher.firstName} ${teacher.lastName}`;

    const confirmed =
      confirm(
        `Delete "${name}"?`
      );

    if (!confirmed) {
      return;
    }

    this.teacherService
      .delete(teacher.id)
      .subscribe({

        next: () => {

          alert(
            'Teacher deleted successfully!'
          );

          this.teachers =
            this.teachers.filter(
              t => t.id !== teacher.id
            );

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'Teacher delete error:',
            error
          );

          alert(
            'Failed to delete teacher.'
          );
        }

      });
  }

  // =========================
  // FULL NAME
  // =========================

  getFullName(
    teacher: Teacher
  ): string {

    return `${teacher.firstName} ${teacher.lastName}`;
  }

}