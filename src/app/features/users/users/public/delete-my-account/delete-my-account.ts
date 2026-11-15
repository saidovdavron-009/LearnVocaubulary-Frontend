import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Input } from '../../../../../shared/ui/input/input';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { DeleteMyAccountService } from './delete-my-account.service';

/** Figma: 17 — "Hisobni o'chirish" banneri, tasdiqlash oynasi bilan. */
@Component({
  selector: 'app-delete-my-account',
  imports: [ReactiveFormsModule, Alert, Button, Icon, Input, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      id="danger"
      class="flex scroll-mt-6 flex-col gap-4 rounded-3xl bg-coral-soft p-6 sm:flex-row sm:items-center"
      aria-labelledby="danger-title"
    >
      <span class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-coral-strong text-fg-inverse">
        <app-icon name="alert" [size]="22" />
      </span>
      <div class="flex-1">
        <h2 id="danger-title" class="text-body-strong text-coral-text">Hisobni o'chirish</h2>
        <p class="mt-1 text-body text-coral-text">
          Barcha so'zlar, statistika va yutuqlar butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
        </p>
      </div>
      <button
        type="button"
        class="h-11 shrink-0 rounded-lg bg-coral-strong px-4.5 text-body-strong text-fg-inverse shadow-hard shadow-coral-text transition-[translate,box-shadow] active:translate-y-0.5 active:shadow-hard-sm"
        (click)="open()"
      >
        Hisobni o'chirish
      </button>
    </section>

    <app-modal [(open)]="isOpen" title="Hisobni o'chirasizmi?" description="Bu amalni qaytarib bo'lmaydi.">
      <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="confirm()">
        @if (error()) {
          <app-alert>{{ error() }}</app-alert>
        }
        @if (hasPassword()) {
          <app-input
            label="Tasdiqlash uchun parolingiz"
            icon="lock"
            type="password"
            autocomplete="current-password"
            formControlName="password"
          />
        }
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
          <button appButton type="submit" variant="dark" icon="trash" [loading]="deleting()">Ha, o'chirish</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class DeleteMyAccount {
  private readonly service = inject(DeleteMyAccountService);
  private readonly shell = inject(AppShellService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly hasPassword = computed(() => this.shell.profile()?.hasPassword ?? true);
  protected readonly form = inject(NonNullableFormBuilder).group({
    password: ['', [Validators.maxLength(128)]],
  });
  protected readonly isOpen = signal(false);
  protected readonly deleting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected open(): void {
    this.form.reset();
    this.error.set(null);
    this.isOpen.set(true);
  }

  protected confirm(): void {
    const password = this.form.getRawValue().password;
    if (this.hasPassword() && !password) {
      this.form.controls.password.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }
    this.deleting.set(true);
    this.service.delete({ password: this.hasPassword() ? password : null }).subscribe({
      next: () => {
        this.isOpen.set(false);
        this.shell.clear();
        this.auth.clearSession();
        this.toast.info("Hisobingiz o'chirildi");
        void this.router.navigate(['/']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.error.set(handleFormError(this.form, err));
      },
    });
  }
}
