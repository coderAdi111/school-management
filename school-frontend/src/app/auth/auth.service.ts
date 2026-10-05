import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay, switchMap, tap, timeout } from 'rxjs';
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

  private readonly backendBase =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8080'
      : 'https://school-management-vy1j.onrender.com';

  private readonly api = `${this.backendBase}/api`;

  /**
   * Render can take a moment to wake the backend and establish its DB connection.
   * Start that work while the login page is already visible so the actual sign-in
   * request does not pay the full cold-start cost.
   */
  private backendWarmup$?: Observable<unknown>;

  private readonly tokenKey = 'school_admin_token';
  private readonly userKey = 'school_admin_user';

  warmUpBackend(): Observable<unknown> {
    if (!this.backendWarmup$) {
      this.backendWarmup$ = this.http
        .get(`${this.backendBase}/actuator/health`)
        .pipe(
          timeout(12000),
          catchError(() => of(null)),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }

    return this.backendWarmup$;
  }

  login(username: string, password: string): Observable<AdminLoginResponse> {
    return this.warmUpBackend().pipe(
      switchMap(() =>
        this.http
          .post<AdminLoginResponse>(`${this.api}/auth/login`, { username, password })
          .pipe(
            tap(response => {
              localStorage.setItem(this.tokenKey, response.token);
              localStorage.setItem(this.userKey, response.username);
            })
          )
      )
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
