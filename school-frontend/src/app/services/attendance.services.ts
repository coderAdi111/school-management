import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';
import { Attendance } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  private baseUrl = 'http://localhost:8080/api/attendance';

  constructor(private http: HttpClient) {}


  // ================================
  // GET ATTENDANCE BY CLASS + DATE
  // ================================
  getByClassAndDate(
    selectedClassId: number,
    selectedDate: string
  ): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/class/${selectedClassId}/date/${selectedDate}`
    );
  }


  // ================================
  // GET ALL ATTENDANCE
  // ================================
  getAll(): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      this.baseUrl
    );
  }


  // ================================
  // GET ATTENDANCE BY ID
  // ================================
  getById(id: number): Observable<Attendance> {

    return this.http.get<Attendance>(
      `${this.baseUrl}/${id}`
    );
  }


  // ================================
  // SEARCH ATTENDANCE
  // ================================
  search(name: string): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/search`,
      {
        params: {
          name: name
        }
      }
    );
  }


  // ================================
  // GET BY CLASS
  // ================================
  getByClass(classId: number): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/class/${classId}`
    );
  }


  // ================================
  // CREATE ATTENDANCE
  // ================================
  create(
    studentId: number,
    classId: number,
    date: string,
    status: string,
    remarks: string
  ): Observable<Attendance> {

    const params = new HttpParams()
      .set('studentId', studentId.toString())
      .set('classId', classId.toString())
      .set('date', date)
      .set('status', status)
      .set('remarks', remarks || '');

    return this.http.post<Attendance>(
      this.baseUrl,
      null,
      {
        params: params
      }
    );
  }


  // ================================
  // UPDATE ATTENDANCE
  // ================================
  update(
    id: number,
    attendance: Attendance
  ): Observable<Attendance> {

    const params = new HttpParams()
      .set('status', attendance.status)
      .set('remarks', attendance.remarks || '');

    return this.http.put<Attendance>(
      `${this.baseUrl}/${id}`,
      null,
      {
        params: params
      }
    );
  }


  // ================================
  // DELETE ATTENDANCE
  // ================================
  delete(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }

}