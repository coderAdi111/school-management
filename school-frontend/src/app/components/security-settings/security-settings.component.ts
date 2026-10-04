import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security-settings.component.html',
  styleUrl: './security-settings.component.css'
})
export class SecuritySettingsComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentPassword = '';
  newUsername = this.auth.getUsername();
  newPassword = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.currentPassword || !this.newUsername.trim() || !this.newPassword) {
      this.errorMessage = 'Please complete all fields.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'New password must be at least 8 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'New password and confirmation do not match.';
      return;
    }

    this.loading = true;
    this.auth.changeCredentials(this.currentPassword, this.newUsername.trim(), this.newPassword)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.successMessage = 'Credentials updated. Redirecting to login...';
          this.auth.clearSession();
          setTimeout(() => this.router.navigateByUrl('/login'), 900);
        },
        error: err => {
          this.errorMessage = err?.error?.message || 'Unable to update credentials.';
        }
      });
  }

  back(): void { this.router.navigateByUrl('/dashboard'); }
}
