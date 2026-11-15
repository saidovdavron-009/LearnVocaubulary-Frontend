import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Textarea } from '../../../../../shared/ui/textarea/textarea';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { CreateReportService } from './create-report.service';

/**
 * Figma: 07 — "Xato topdingizmi?" marjon banneri (variant="banner") yoki bayroqcha ikonka (variant="icon").
 * Ikkalasi ham shikoyat oynasini ochadi (POST /api/words/{wordId}/reports).
 */
@Component({
  selector: 'app-create-report',
  imports: [ReactiveFormsModule, Alert, Button, Icon, Modal, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (variant() === 'banner') {
      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-3xl bg-coral-soft px-6 py-5 text-left text-body text-coral-text transition-colors hover:bg-coral-soft/70"
        (click)="open()"
      >
        <app-icon name="flag" [size]="20" class="mt-0.5" />
        Xato topdingizmi? Tarjima yoki misol haqida xabar bering.
      </button>
    } @else {
      <button
        type="button"
        class="flex size-10 items-center justify-center rounded-input bg-muted text-fg-secondary transition-colors hover:text-fg"
        aria-label="Xato haqida xabar berish"
        (click)="open()"
      >
        <app-icon name="flag" [size]="20" />
      </button>
    }

    <app-modal [(open)]="isOpen" title="Xato haqida xabar berish" [description]="'«' + wordText() + '» so‘zida nima noto‘g‘ri?'">
      <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="submit()">
        @if (error()) {
          <app-alert>{{ error() }}</app-alert>
        }
        <app-textarea
          label="Xabar"
          placeholder="Masalan: tarjima noto'g'ri, to'g'risi — …"
          [maxlength]="2000"
          helper="Kamida 10 belgi"
          formControlName="message"
        />
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
          <button appButton type="submit" icon="send" [loading]="saving()">Yuborish</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CreateReport {
  private readonly service = inject(CreateReportService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly wordId = input.required<number>();
  readonly wordText = input.required<string>();
  readonly variant = input<'banner' | 'icon'>('icon');

  protected readonly isOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected open(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.form.reset();
    this.error.set(null);
    this.isOpen.set(true);
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.service.create(this.wordId(), { message: this.form.getRawValue().message.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.isOpen.set(false);
        this.toast.success('Rahmat! Xabaringiz moderatorlarga yuborildi.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(handleFormError(this.form, err));
      },
    });
  }
}
