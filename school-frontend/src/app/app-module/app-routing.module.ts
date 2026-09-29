import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from '../components/dashboard/dashboard.component';

import { StudentListComponent } from '../components/student-list/student-list.component';

import { StudentFormComponent } from '../components/student-form/student-form.component';

import { TeacherListComponent } from '../components/teacher-list/teacher-list.component';

import { ClassList } from '../components/class-list/class-list.component';

import { AttendanceListComponent } from '../components/attendance-list/attendance-list.component';

import { FeeList } from '../components/fee-list/fee-list.component';

import { MarkListComponent } from '../components/mark-list/mark-list.component';


export const routes: Routes = [

  // =========================
  // DASHBOARD
  // =========================

  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: DashboardComponent },


  // =========================
  // STUDENTS
  // =========================

  { path: 'students', component: StudentListComponent },

  { path: 'students/new', component: StudentFormComponent },

  { path: 'students/:id/edit', component: StudentFormComponent },


  // =========================
  // TEACHERS
  // =========================

  { path: 'teachers', component: TeacherListComponent },


  // =========================
  // CLASSES
  // =========================

  { path: 'classes', component: ClassList },


  // =========================
  // ATTENDANCE
  // =========================

  { path: 'attendance', component: AttendanceListComponent },


  // =========================
  // FEES
  // =========================

  { path: 'fees', component: FeeList },


  // =========================
  // MARKS
  // =========================

  { path: 'marks', component: MarkListComponent },


  // =========================
  // UNKNOWN ROUTE
  // =========================

  { path: '**', redirectTo: '/dashboard' }

];


@NgModule({

  imports: [
    RouterModule.forRoot(routes)
  ],

  exports: [
    RouterModule
  ]

})
export class AppRoutingModule {}