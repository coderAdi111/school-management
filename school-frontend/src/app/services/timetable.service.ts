import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TimetableEntry {
  id?: number;
  branch: string;
  semester: number;
 section: string;
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

  get(section: string): Observable<TimetableEntry[]> {
    const params = new HttpParams().set('branch', 'IT').set('semester', '5').set('section', section);
    return this.http.get<TimetableEntry[]>(this.baseUrl, { params });
  }
  create(entry: TimetableEntry): Observable<TimetableEntry> { return this.http.post<TimetableEntry>(this.baseUrl, entry); }
  update(id: number, entry: TimetableEntry): Observable<TimetableEntry> { return this.http.put<TimetableEntry>(`${this.baseUrl}/${id}`, entry); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
}
