import { OAuthButtons } from '../oauth-buttons/oauth-buttons';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Input } from '../../../../../shared/ui/input/input';
import { SignUpService } from './sign-up.service';

/** Backend SignUpValidator bilan bir xil qoidalar. */
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,50}$/;
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).+$/u;

/** Figma: 02 — "Ro'yxatdan o'tish" tabi (Kirish formasi uslubida). */
@Component({
  selector: 'app-sign-up',
  imports: [OAuthButtons, ReactiveFormsModule, RouterLink, Alert, Button, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-up.html',
})
export class SignUp {
  private readonly service = inject(SignUpService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    displayName: ['', [Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(64), Validators.pattern(PASSWORD_PATTERN)],
    ],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const value = this.form.getRawValue();
    this.service
      .signUp({
        email: value.email.trim(),
        username: value.username.trim(),
        password: value.password,
        displayName: value.displayName.trim() || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      })
      .subscribe({
        next: (res) => {
          this.auth.setSession(res, true);
          void this.router.navigate(['/verify-email'], { state: { email: res.email } });
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(handleFormError(this.form, err));
        },
      });
  }
}
