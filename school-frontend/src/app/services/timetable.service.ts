import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TimetableEntry {
  id?: number;
  department: string;
  branch: string;
  semester: number;
  section: string;
  sectionGroup?: string;
  dayOfWeek: string;
  subject: string;
  faculty?: string;
  room?: string;
  startTime: string;
  endTime: string;
  practical: boolean;
}

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private readonly baseUrl =
  globalThis.location?.hostname === 'localhost'
    ? 'http://localhost:8080/api/timetable'
    : 'https://school-management-vy1j.onrender.com/api/timetable';
  constructor(private http: HttpClient) {}

  get(section: string, department = 'Computer Science And Engineering', branch = 'IT', semester = 5): Observable<TimetableEntry[]> {
    const params = new HttpParams()
      .set('department', department)
      .set('branch', branch)
      .set('semester', String(semester))
      .set('section', section);
    return this.http.get<TimetableEntry[]>(this.baseUrl, { params });
  }

  /** Complete timetable dataset used by Teacher Schedule. */
  getAll(): Observable<TimetableEntry[]> {
    return this.http.get<TimetableEntry[]>(`${this.baseUrl}/all`);
  }
  create(entry: TimetableEntry): Observable<TimetableEntry> { return this.http.post<TimetableEntry>(this.baseUrl, entry); }
  update(id: number, entry: TimetableEntry): Observable<TimetableEntry> { return this.http.put<TimetableEntry>(`${this.baseUrl}/${id}`, entry); }
  updateGroup(id: number, entry: TimetableEntry): Observable<TimetableEntry> { return this.http.put<TimetableEntry>(`${this.baseUrl}/group/${id}`, entry); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
  deleteGroup(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/group/${id}`); }
  deleteScoped(department: string, branch: string, semester: number, sections: string[]): Observable<number> {
    let params = new HttpParams()
      .set('department', department)
      .set('branch', branch)
      .set('semester', String(semester));
    sections.forEach(section => { params = params.append('sections', section); });
    return this.http.delete<number>(`${this.baseUrl}/scoped`, { params });
  }
}
