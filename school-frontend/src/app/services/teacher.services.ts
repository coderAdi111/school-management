import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Teacher } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
private baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api/teachers'
      : 'https://school-management-vy1j.onrender.com/api/teachers';
  constructor(
    private http: HttpClient
  ) {}

  // GET ALL
  getAll(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(this.baseUrl);
  }

  // GET BY ID
  getById(id: number): Observable<Teacher> {
    return this.http.get<Teacher>(
      `${this.baseUrl}/${id}`
    );
  }

  // SEARCH
  search(name: string): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(
      `${this.baseUrl}/search`,
      {
        params: {
          name: name
        }
      }
    );
  }

  // CREATE
  create(teacher: Teacher): Observable<Teacher> {
    return this.http.post<Teacher>(
      this.baseUrl,
      teacher
    );
  }

  // UPDATE
  update(
    id: number,
    teacher: Teacher
  ): Observable<Teacher> {
    return this.http.put<Teacher>(
      `${this.baseUrl}/${id}`,
      teacher
    );
  }

  // DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }
}