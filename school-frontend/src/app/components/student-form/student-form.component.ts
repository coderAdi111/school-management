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
import { AcademicService } from '../../services/academic.service';
import { forkJoin } from 'rxjs';

import {
  Student,
  ClassRoom,
  AcademicDepartment,
  AcademicBranch,
  AcademicSemester,
  AcademicSection
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

  academicDepartments: AcademicDepartment[] = [];
  academicBranches: AcademicBranch[] = [];
  academicSemesters: AcademicSemester[] = [];
  academicSections: AcademicSection[] = [];

  selectedDepartment = '';
  selectedBranch = '';
  selectedSemester: number | '' = '';
  selectedSection = '';

  student: Student = this.emptyStudent();


  constructor(
    private studentService: StudentService,
    private classroomService: ClassroomService,
    private academicService: AcademicService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // ================================
  // INIT
  // ================================

  ngOnInit(): void {

    this.loadClasses();
    this.loadAcademicStructure();

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

          this.classes = data ?? [];

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
  // ACADEMIC STRUCTURE
  // ================================

  loadAcademicStructure(): void {
    this.academicService.departments().subscribe({
      next: departments => {
        this.academicDepartments = (departments ?? []).filter(d => d.active !== false);
        const branchCalls = this.academicDepartments.filter(d => d.id).map(d => this.academicService.branches(d.id!));
        if (!branchCalls.length) return;
        forkJoin(branchCalls).subscribe({
          next: branchResults => {
            this.academicBranches = branchResults.flat().filter(b => b.active !== false);
            const semesterCalls = this.academicBranches.filter(b => b.id).map(b => this.academicService.semesters(b.id!));
            if (!semesterCalls.length) return;
            forkJoin(semesterCalls).subscribe({
              next: semesterResults => {
                this.academicSemesters = semesterResults.flat().filter(s => s.active !== false);
                const sectionCalls = this.academicSemesters.filter(s => s.id).map(s => this.academicService.sections(s.id!));
                if (!sectionCalls.length) { this.cdr.detectChanges(); return; }
                forkJoin(sectionCalls).subscribe({
                  next: sectionResults => {
                    this.academicSections = sectionResults.flat().filter(s => s.active !== false);
                    this.cdr.detectChanges();
                  },
                  error: e => console.error('Academic sections load error:', e)
                });
              },
              error: e => console.error('Academic semesters load error:', e)
            });
          },
          error: e => console.error('Academic branches load error:', e)
        });
      },
      error: e => console.error('Academic departments load error:', e)
    });
  }

  get departments(): string[] {
    return this.academicDepartments.map(d => d.name).filter(Boolean).sort();
  }

  get branches(): string[] {
    const dept = this.academicDepartments.find(d => d.name === this.selectedDepartment);
    return this.academicBranches
      .filter(b => !dept || b.department?.id === dept.id)
      .map(b => b.code || b.name)
      .filter(Boolean)
      .sort();
  }

  get semesters(): number[] {
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.selectedBranch);
    return this.academicSemesters
      .filter(s => !branch || s.branch?.id === branch.id)
      .map(s => Number(s.semesterNumber))
      .filter(n => n > 0)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);
  }

  get sections(): string[] {
    const branch = this.academicBranches.find(b => (b.code || b.name) === this.selectedBranch);
    const semester = this.academicSemesters.find(
      s => s.branch?.id === branch?.id && Number(s.semesterNumber) === Number(this.selectedSemester)
    );
    return this.academicSections
      .filter(s => !semester || s.semester?.id === semester.id)
      .map(s => s.name)
      .filter(Boolean)
      .sort();
  }

  onDepartmentChange(): void {
    this.selectedBranch = '';
    this.selectedSemester = '';
    this.selectedSection = '';
    this.student.classRoom = undefined;
  }

  onBranchChange(): void {
    this.selectedSemester = '';
    this.selectedSection = '';
    this.student.classRoom = undefined;
  }

  onSemesterChange(): void {
    this.selectedSection = '';
    this.student.classRoom = undefined;
  }

  onSectionChange(): void {
    const classroom = this.classes.find(c =>
      c.department === this.selectedDepartment &&
      c.branch === this.selectedBranch &&
      Number(c.semester) === Number(this.selectedSemester) &&
      c.section === this.selectedSection
    );

    this.student.classRoom = classroom ? { ...classroom } : undefined;
    this.cdr.detectChanges();
  }

  private syncSelectorsFromClassroom(classroom?: ClassRoom): void {
    if (!classroom) return;
    this.selectedDepartment = classroom.department || '';
    this.selectedBranch = classroom.branch || '';
    this.selectedSemester = classroom.semester ? Number(classroom.semester) : '';
    this.selectedSection = classroom.section || '';
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
          this.syncSelectorsFromClassroom(this.student.classRoom);

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

        department:
          this.student.classRoom.department,

        branch:
          this.student.classRoom.branch,

        semester:
          this.student.classRoom.semester,

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