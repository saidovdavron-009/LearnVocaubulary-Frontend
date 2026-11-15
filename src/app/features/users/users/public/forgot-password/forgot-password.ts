import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Input } from '../../../../../shared/ui/input/input';
import { ForgotPasswordService } from './forgot-password.service';

/** Figma: 03 — "Parolni tiklash" kartasi. */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, Icon, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh items-center justify-center bg-page px-4 py-10' },
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly service = inject(ForgotPasswordService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
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
    const email = this.form.getRawValue().email.trim();
    this.service.sendCode({ email }).subscribe({
      next: () => void this.router.navigate(['/reset-password'], { queryParams: { email } }),
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(handleFormError(this.form, err));
      },
    });
  }
}
