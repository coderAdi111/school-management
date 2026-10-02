import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  submit(): void {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Please enter your admin username and password.';
      return;
    }

    this.loading = true;

    this.auth.login(this.username.trim(), this.password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: error => {
          this.errorMessage =
            error?.status === 401
              ? 'Invalid admin username or password.'
              : 'Unable to connect to the management server.';
        }
      });
  }
}
