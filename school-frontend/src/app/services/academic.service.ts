import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcademicDepartment, AcademicBranch, AcademicSemester, AcademicSection } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private readonly baseUrl =
    globalThis.location?.hostname === 'localhost'
      ? 'http://localhost:8080/api/academics'
      : 'https://school-management-vy1j.onrender.com/api/academics';

  constructor(private http: HttpClient) {}

  departments(): Observable<AcademicDepartment[]> {
    return this.http.get<AcademicDepartment[]>(`${this.baseUrl}/departments`);
  }
  createDepartment(v: AcademicDepartment): Observable<AcademicDepartment> {
    return this.http.post<AcademicDepartment>(`${this.baseUrl}/departments`, v);
  }
  updateDepartment(id: number, v: AcademicDepartment): Observable<AcademicDepartment> {
    return this.http.put<AcademicDepartment>(`${this.baseUrl}/departments/${id}`, v);
  }
  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/departments/${id}`);
  }

  branches(departmentId: number): Observable<AcademicBranch[]> {
    return this.http.get<AcademicBranch[]>(`${this.baseUrl}/branches`, { params: new HttpParams().set('departmentId', departmentId) });
  }
  createBranch(v: AcademicBranch): Observable<AcademicBranch> {
    return this.http.post<AcademicBranch>(`${this.baseUrl}/branches`, v);
  }
  updateBranch(id: number, v: AcademicBranch): Observable<AcademicBranch> {
    return this.http.put<AcademicBranch>(`${this.baseUrl}/branches/${id}`, v);
  }
  deleteBranch(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/branches/${id}`);
  }

  semesters(branchId: number): Observable<AcademicSemester[]> {
    return this.http.get<AcademicSemester[]>(`${this.baseUrl}/semesters`, { params: new HttpParams().set('branchId', branchId) });
  }
  createSemester(v: AcademicSemester): Observable<AcademicSemester> {
    return this.http.post<AcademicSemester>(`${this.baseUrl}/semesters`, v);
  }
  updateSemester(id: number, v: AcademicSemester): Observable<AcademicSemester> {
    return this.http.put<AcademicSemester>(`${this.baseUrl}/semesters/${id}`, v);
  }
  deleteSemester(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/semesters/${id}`);
  }

  sections(semesterId: number): Observable<AcademicSection[]> {
    return this.http.get<AcademicSection[]>(`${this.baseUrl}/sections`, { params: new HttpParams().set('semesterId', semesterId) });
  }
  createSection(v: AcademicSection): Observable<AcademicSection> {
    return this.http.post<AcademicSection>(`${this.baseUrl}/sections`, v);
  }
  updateSection(id: number, v: AcademicSection): Observable<AcademicSection> {
    return this.http.put<AcademicSection>(`${this.baseUrl}/sections/${id}`, v);
  }
  deleteSection(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sections/${id}`);
  }
}
