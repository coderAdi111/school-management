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

import { TimetableComponent } from '../components/timetable/timetable.component';

// =========================
// ADMIN AUTH
// =========================

import { AdminLoginComponent } from '../components/admin-login/admin-login.component';
import { authGuard } from '../auth/auth.guard';
import { SecuritySettingsComponent } from '../components/security-settings/security-settings.component';


export const routes: Routes = [

  // =========================
  // PUBLIC LOGIN
  // =========================

  {
    path: 'login',
    component: AdminLoginComponent
  },


  // =========================
  // DEFAULT ROUTE
  // =========================

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },


  // =========================
  // DASHBOARD
  // =========================

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },


  {
    path: 'security-settings',
    component: SecuritySettingsComponent,
    canActivate: [authGuard]
  },

  // =========================
  // STUDENTS
  // =========================

  {
    path: 'students',
    component: StudentListComponent,
    canActivate: [authGuard]
  },

  {
    path: 'students/new',
    component: StudentFormComponent,
    canActivate: [authGuard]
  },

  {
    path: 'students/:id/edit',
    component: StudentFormComponent,
    canActivate: [authGuard]
  },


  // =========================
  // TEACHERS
  // =========================

  {
    path: 'teachers',
    component: TeacherListComponent,
    canActivate: [authGuard]
  },


  // =========================
  // CLASSES
  // =========================

  {
    path: 'classes',
    component: ClassList,
    canActivate: [authGuard]
  },


  // =========================
  // ATTENDANCE
  // =========================

  {
    path: 'attendance',
    component: AttendanceListComponent,
    canActivate: [authGuard]
  },


  // =========================
  // TIMETABLE
  // =========================

  {
    path: 'timetable',
    component: TimetableComponent,
    canActivate: [authGuard]
  },


  // =========================
  // FEES
  // =========================

  {
    path: 'fees',
    component: FeeList,
    canActivate: [authGuard]
  },


  // =========================
  // MARKS
  // =========================

  {
    path: 'marks',
    component: MarkListComponent,
    canActivate: [authGuard]
  },


  // =========================
  // UNKNOWN ROUTE
  // =========================

  {
    path: '**',
    redirectTo: '/dashboard'
  }

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