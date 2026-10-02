import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { Student } from '../models/models';


@Injectable({
  providedIn: 'root'
})
export class StudentService {
private baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api/students'
      : 'https://school-management-vy1j.onrender.com/api/students';
  constructor(
    private http: HttpClient
  ) {}


  // =========================
  // GET ALL
  // =========================

  getAll(): Observable<Student[]> {

    return this.http.get<Student[]>(
      this.baseUrl
    );

  }


  // =========================
  // GET BY ID
  // =========================

  getById(
    id: number
  ): Observable<Student> {

    return this.http.get<Student>(
      `${this.baseUrl}/${id}`
    );

  }


  // =========================
  // SEARCH
  // =========================

  search(
    name: string
  ): Observable<Student[]> {

    return this.http.get<Student[]>(
      `${this.baseUrl}/search`,
      {
        params: {
          name
        }
      }
    );

  }


  // =========================
  // GET BY CLASS
  // =========================

  getByClass(
    classId: number
  ): Observable<Student[]> {

    return this.http.get<Student[]>(
      `${this.baseUrl}/class/${classId}`
    );

  }


  // =========================
  // CREATE
  // =========================

  create(
    student: Student
  ): Observable<Student> {

    return this.http.post<Student>(
      this.baseUrl,
      student
    );

  }


  // =========================
  // UPDATE
  // =========================

  update(
    id: number,
    student: Student
  ): Observable<Student> {

    return this.http.put<Student>(
      `${this.baseUrl}/${id}`,
      student
    );

  }


  // =========================
  // DELETE
  // =========================

  delete(
    id: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );

  }

}