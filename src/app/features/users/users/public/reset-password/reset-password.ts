import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getProblemDetails, handleFormError, problemMessage } from '../../../../../core/api/problem-details';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Input } from '../../../../../shared/ui/input/input';
import { createCountdown } from '../../../../../shared/ui/otp-input/countdown';
import { OtpInput } from '../../../../../shared/ui/otp-input/otp-input';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ResetPasswordService } from './reset-password.service';

const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).+$/u;
const RESEND_COOLDOWN_SECONDS = 60;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmPassword');
  if (!confirm) return null;
  const mismatch = !!confirm.value && password !== confirm.value;
  const errors = { ...(confirm.errors ?? {}) };
  if (mismatch) errors['mismatch'] = true;
  else delete errors['mismatch'];
  confirm.setErrors(Object.keys(errors).length ? errors : null);
  return null;
}

/**
 * Figma: 03 — "Emailingizni tekshiring" (6 xonali kod) kartasi, keyin yangi parol.
 * /reset-password?email=... — forgot-password sahifasidan keladi.
 */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, Icon, Input, OtpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh items-center justify-center bg-page px-4 py-10' },
  templateUrl: './reset-password.html',
})
export class ResetPassword implements OnInit {
  private readonly service = inject(ResetPasswordService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly email = input<string>('');

  protected readonly step = signal<'code' | 'password'>('code');
  protected readonly code = signal('');
  protected readonly codeError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resend = createCountdown();

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(64), Validators.pattern(PASSWORD_PATTERN)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    if (!this.email()) {
      void this.router.navigate(['/forgot-password']);
      return;
    }
    // Kod hozirgina yuborilgan.
    this.resend.start(RESEND_COOLDOWN_SECONDS);
  }

  protected confirmCode(): void {
    if (this.code().length !== 6) {
      this.codeError.set('6 xonali kodni kiriting');
      return;
    }
    this.codeError.set(null);
    this.step.set('password');
  }

  protected resendCode(): void {
    if (this.resend.running()) return;
    this.service.resendCode({ email: this.email() }).subscribe({
      next: () => {
        this.code.set('');
        this.codeError.set(null);
        this.resend.start(RESEND_COOLDOWN_SECONDS);
        this.toast.success('Yangi kod yuborildi');
      },
      error: (err: unknown) => this.toast.error(problemMessage(err)),
    });
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.service
      .resetPassword({ email: this.email(), code: this.code(), newPassword: this.form.getRawValue().newPassword })
      .subscribe({
        next: () => {
          this.toast.success('Parol yangilandi. Endi yangi parol bilan kiring.');
          void this.router.navigate(['/login']);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          // Kod xatosi — kod kiritish bosqichiga qaytamiz.
          const codeProblem = getProblemDetails(err)?.errors?.find((e) => e.name.toLowerCase() === 'code');
          if (codeProblem) {
            this.codeError.set(codeProblem.reason);
            this.code.set('');
            this.step.set('code');
            return;
          }
          this.error.set(handleFormError(this.form, err));
        },
      });
  }
}
