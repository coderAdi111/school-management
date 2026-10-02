import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { ClassRoom } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
private baseUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api/classes'
      : 'https://school-management-vy1j.onrender.com/api/classes';
  constructor(
    private http: HttpClient
  ) {}

  // GET ALL
  getAll(): Observable<ClassRoom[]> {

    console.log(
      'ClassroomService.getAll() called'
    );

    return this.http.get<ClassRoom[]>(
      this.baseUrl
    ).pipe(

      tap((data) => {

        console.log(
          'ClassroomService response:',
          data
        );

      }),

      catchError((error) => {

        console.error(
          'ClassroomService HTTP error:',
          error
        );

        return throwError(
          () => error
        );

      })

    );
  }

  // GET BY ID
  getById(id: number): Observable<ClassRoom> {

    return this.http.get<ClassRoom>(
      `${this.baseUrl}/${id}`
    );
  }

  // CREATE
  create(
    classroom: ClassRoom
  ): Observable<ClassRoom> {

    return this.http.post<ClassRoom>(
      this.baseUrl,
      classroom
    );
  }

  // UPDATE
  update(
    id: number,
    classroom: ClassRoom
  ): Observable<ClassRoom> {

    return this.http.put<ClassRoom>(
      `${this.baseUrl}/${id}`,
      classroom
    );
  }

  // DELETE
  delete(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }
}