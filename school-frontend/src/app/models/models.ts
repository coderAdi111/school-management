import { Component } from '@angular/core';

@Component({
  selector: 'app-models',
  imports: [],
  templateUrl: './models.html',
  styleUrl: './models.css',
})
export class Models {}
export interface ClassRoom {
  id?: number;
  name: string;
  grade: string;
  section?: string;
  department?: string;
  branch?: string;
  semester?: number;
  teacher?: Teacher;
  capacity?: number;
  createdAt?: string;
}
export interface Student {
 id?: number;
 rollNo?: string;
 firstName: string;
 lastName: string;
 email: string;
 phone?: string;
 dateOfBirth?: string; 
 address?: string;
 classRoom?: ClassRoom; 
 enrollmentDate?: string;
 status?: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
 createdAt?: string;
}
export interface Attendance {
  id?: number;
  student?: Student;
  classRoom?: ClassRoom;
  date: string;
  subject?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
}
export interface Fee {
 id?: number;
 student?: Student;
 feeType: string;
 amount: number;
 dueDate: string;
 paidDate?: string;
 status?: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
 remarks?: string;
}
export interface Mark {
 id?: number;
 student?: Student;
 classRoom?: ClassRoom;
 subject: string;
 examType: string;
 marksObtained: number;
 totalMarks: number;
 examDate: string;
 remarks?: string;
}

export interface TeacherAssignment {
  departmentId?: number;
  departmentName?: string;
  branchId?: number;
  branchName?: string;
  branchCode?: string;
  semesterId?: number;
  semesterName?: string;
  sectionId?: number;
  sectionName?: string;
  subject: string;
}

export interface Teacher {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  subject?: string;
  facultyCode?: string;
  qualification?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  teachingAssignments?: string;
  assignments?: TeacherAssignment[];
}
export interface AcademicDepartment {
  id?: number;
  name: string;
  code: string;
  active?: boolean;
}

export interface AcademicBranch {
  id?: number;
  name: string;
  code: string;
  department: AcademicDepartment;
  active?: boolean;
}

export interface AcademicSemester {
  id?: number;
  semesterNumber: number;
  name: string;
  branch: AcademicBranch;
  active?: boolean;
}

export interface AcademicSection {
  id?: number;
  name: string;
  semester: AcademicSemester;
  active?: boolean;
}
