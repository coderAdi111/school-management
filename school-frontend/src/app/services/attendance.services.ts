import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Attendance } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  private baseUrl =
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api/attendance'
      : 'https://school-management-vy1j.onrender.com/api/attendance';

  constructor(private http: HttpClient) {}

  getByClassAndDate(
    classId: number,
    date: string,
    subject?: string
  ): Observable<Attendance[]> {

    let params = new HttpParams();

    if (subject) {
      params = params.set('subject', subject);
    }

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/class/${classId}/date/${date}`,
      { params }
    );
  }

  getByClassAndSubject(
    classId: number,
    subject: string
  ): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/class/${classId}/subject/${encodeURIComponent(subject)}`
    );
  }

  getByStudent(studentId: number): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/student/${studentId}`
    );
  }

  getAll(): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      this.baseUrl
    );
  }

  getById(id: number): Observable<Attendance> {

    return this.http.get<Attendance>(
      `${this.baseUrl}/${id}`
    );
  }

  getByClass(classId: number): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/class/${classId}`
    );
  }

  search(name: string): Observable<Attendance[]> {

    return this.http.get<Attendance[]>(
      `${this.baseUrl}/search`,
      {
        params: {
          name
        }
      }
    );
  }

  create(
    studentId: number,
    classId: number,
    date: string,
    subject: string,
    status: string,
    remarks: string
  ): Observable<Attendance> {

    let params = new HttpParams()
      .set('studentId', studentId.toString())
      .set('classId', classId.toString())
      .set('date', date)
      .set('subject', subject)
      .set('status', status)
      .set('remarks', remarks || '');

    return this.http.post<Attendance>(
      this.baseUrl,
      null,
      { params }
    );
  }

  update(
    id: number,
    attendance: Attendance
  ): Observable<Attendance> {

    let params = new HttpParams()
      .set('status', attendance.status)
      .set('subject', attendance.subject || '')
      .set('remarks', attendance.remarks || '');

    return this.http.put<Attendance>(
      `${this.baseUrl}/${id}`,
      null,
      { params }
    );
  }

  delete(id: number): Observable<void> {

    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }
}