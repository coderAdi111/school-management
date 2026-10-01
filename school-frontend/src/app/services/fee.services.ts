import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Fee } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FeeService {

 private baseUrl =
  'https://school-management-vy1j.onrender.com/api/fees';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Fee[]> {
    return this.http.get<Fee[]>(this.baseUrl);
  }

  getById(id: number): Observable<Fee> {
    return this.http.get<Fee>(
      `${this.baseUrl}/${id}`
    );
  }

  search(name: string): Observable<Fee[]> {
    return this.http.get<Fee[]>(
      `${this.baseUrl}/search`,
      {
        params: { name }
      }
    );
  }

  getByClass(classId: number): Observable<Fee[]> {
    return this.http.get<Fee[]>(
      `${this.baseUrl}/class/${classId}`
    );
  }

  create(fee: Fee): Observable<Fee> {
    return this.http.post<Fee>(
      this.baseUrl,
      fee
    );
  }

  update(id: number, fee: Fee): Observable<Fee> {
    return this.http.put<Fee>(
      `${this.baseUrl}/${id}`,
      fee
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }
}
