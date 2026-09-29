import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Mark } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class MarkService {

  private baseUrl = 'http://localhost:8080/api/marks';

  constructor(
    private http: HttpClient
  ) {}

  // GET ALL MARKS
  getAll(): Observable<Mark[]> {
    return this.http.get<Mark[]>(
      this.baseUrl
    );
  }

  // GET MARK BY ID
  getById(id: number): Observable<Mark> {
    return this.http.get<Mark>(
      `${this.baseUrl}/${id}`
    );
  }

  // GET MARKS BY STUDENT
  getByStudent(id: number): Observable<Mark[]> {
    return this.http.get<Mark[]>(
      `${this.baseUrl}/student/${id}`
    );
  }

  // GET MARKS BY CLASS + SUBJECT
  getByClassAndSubject(
    classId: number,
    subject: string
  ): Observable<Mark[]> {

    return this.http.get<Mark[]>(
      `${this.baseUrl}/class/${classId}/subject/${encodeURIComponent(subject)}`
    );
  }

  // GET MARKS BY STUDENT + EXAM
  getByStudentAndExam(
    studentId: number,
    examType: string
  ): Observable<Mark[]> {

    return this.http.get<Mark[]>(
      `${this.baseUrl}/student/${studentId}/exam/${encodeURIComponent(examType)}`
    );
  }

  // CREATE
  create(mark: Mark): Observable<Mark> {
    return this.http.post<Mark>(
      this.baseUrl,
      mark
    );
  }

  // UPDATE
  update(
    id: number,
    mark: Mark
  ): Observable<Mark> {

    return this.http.put<Mark>(
      `${this.baseUrl}/${id}`,
      mark
    );
  }

  // DELETE
  delete(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }
}