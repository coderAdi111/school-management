import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AdminLoginResponse {
  token: string;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly api =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8080/api'
      : 'https://school-management-vy1j.onrender.com/api';

  private readonly tokenKey = 'school_admin_token';
  private readonly userKey = 'school_admin_user';

  login(username: string, password: string): Observable<AdminLoginResponse> {
    return this.http
      .post<AdminLoginResponse>(`${this.api}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.userKey, response.username);
        })
      );
  }

  changeCredentials(currentPassword: string, newUsername: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/change-credentials`, {
      currentPassword, newUsername, newPassword
    });
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  logout(): void {
    const token = this.getToken();

    if (token) {
      this.http.post(`${this.api}/auth/logout`, {}).subscribe({
        error: () => undefined
      });
    }

    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUsername(): string {
    return localStorage.getItem(this.userKey) || 'Admin';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
