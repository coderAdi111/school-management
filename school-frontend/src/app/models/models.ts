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
  teacher?: Teacher;
  capacity?: number;
  createdAt?: string;
}
export interface Student {
 id?: number;
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

export interface Teacher {
  id?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  subject?: string;
  qualification?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}