import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const isAuthRequest = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/logout') || req.url.includes('/actuator/health');
  const request = token && !isAuthRequest
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError(error => {
      if (error.status === 401 && !isAuthRequest) {
        localStorage.removeItem('school_admin_token');
        localStorage.removeItem('school_admin_user');
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    })
  );
};
