import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Input } from '../../../../../shared/ui/input/input';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ChangePasswordService } from './change-password.service';

const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).+$/u;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const confirm = group.get('confirmPassword');
  if (!confirm) return null;
  const mismatch = !!confirm.value && group.get('newPassword')?.value !== confirm.value;
  const errors = { ...(confirm.errors ?? {}) };
  if (mismatch) errors['mismatch'] = true;
  else delete errors['mismatch'];
  confirm.setErrors(Object.keys(errors).length ? errors : null);
  return null;
}

/**
 * "Xavfsizlik" bo'limi (Figma sidebar'ida bor, kartasi chizilmagan — shu uslubda).
 * Parol bor bo'lsa — o'zgartirish (seans yopiladi, qayta kirish kerak); yo'q bo'lsa — o'rnatish.
 */
@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, Alert, Button, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section id="security" class="scroll-mt-6 rounded-3xl border-2 border-line bg-surface p-6 md:p-7" aria-labelledby="security-title">
      <h2 id="security-title" class="font-display text-h3 text-fg">Xavfsizlik</h2>
      <p class="mt-1 text-body text-fg-secondary">
        @if (hasPassword()) {
          Parolni o'zgartirgandan keyin hisobingizga qayta kirasiz.
        } @else {
          Hisobingizda parol yo'q. Email va parol bilan ham kirish uchun parol o'rnating.
        }
      </p>

      <form [formGroup]="form" class="mt-5 flex flex-col gap-5" novalidate (ngSubmit)="submit()">
        @if (error()) {
          <app-alert>{{ error() }}</app-alert>
        }
        <div class="grid gap-5 md:grid-cols-3">
          @if (hasPassword()) {
            <app-input
              label="Joriy parol"
              icon="lock"
              type="password"
              autocomplete="current-password"
              formControlName="currentPassword"
            />
          }
          <app-input
            label="Yangi parol"
            icon="lock"
            type="password"
            autocomplete="new-password"
            helper="Kamida 8 belgi, harf va raqam"
            formControlName="newPassword"
            [errorMessages]="{ pattern: 'Parolda kamida bitta harf va bitta raqam bo‘lishi kerak' }"
          />
          <app-input
            label="Parolni takrorlang"
            icon="lock"
            type="password"
            autocomplete="new-password"
            formControlName="confirmPassword"
            [errorMessages]="{ mismatch: 'Parollar mos kelmadi' }"
          />
        </div>
        <div class="flex justify-end">
          <button appButton type="submit" icon="check" [loading]="saving()">
            {{ hasPassword() ? "Parolni o'zgartirish" : "Parol o'rnatish" }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class ChangePassword {
  private readonly service = inject(ChangePasswordService);
  private readonly shell = inject(AppShellService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly hasPassword = computed(() => this.shell.profile()?.hasPassword ?? true);
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      currentPassword: ['', [Validators.required, Validators.maxLength(128)]],
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(64), Validators.pattern(PASSWORD_PATTERN)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Parolsiz hisobda "joriy parol" maydoni talab qilinmaydi.
    effect(() => {
      const current = this.form.controls.currentPassword;
      if (this.hasPassword()) current.enable({ emitEvent: false });
      else current.disable({ emitEvent: false });
    });
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    const changing = this.hasPassword();
    const request$: Observable<void> = changing
      ? this.service.change({ currentPassword, newPassword })
      : this.service.set({ newPassword });

    this.saving.set(true);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        if (changing) {
          this.toast.success('Parol o‘zgartirildi. Yangi parol bilan qayta kiring.');
          this.auth.endSession();
        } else {
          this.toast.success('Parol o‘rnatildi');
          this.shell.refreshProfile();
        }
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(handleFormError(this.form, err));
      },
    });
  }
}
