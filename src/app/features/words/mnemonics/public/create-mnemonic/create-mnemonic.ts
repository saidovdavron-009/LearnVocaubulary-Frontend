import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Textarea } from '../../../../../shared/ui/textarea/textarea';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { CreateMnemonicResponse } from './create-mnemonic.models';
import { CreateMnemonicService } from './create-mnemonic.service';

/** Figma: 07 — "Usul qo'shish +" tugmasi va oynasi. */
@Component({
  selector: 'app-create-mnemonic',
  imports: [ReactiveFormsModule, Alert, Button, Modal, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button appButton type="button" variant="soft" size="s" icon="plus" (click)="open()">Usul qo'shish</button>
    <app-modal [(open)]="isOpen" title="Eslab qolish usuli" [description]="'«' + wordText() + '» so‘zini qanday eslab qolasiz?'">
      <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="submit()">
        @if (error()) {
          <app-alert>{{ error() }}</app-alert>
        }
        <app-textarea label="Usul" placeholder="Masalan: “Brave” — “bravo!” deb olqishlanadigan jasur odam" [maxlength]="1000" formControlName="text" />
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
          <button appButton type="submit" icon="check" [loading]="saving()">Qo'shish</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CreateMnemonic {
  private readonly service = inject(CreateMnemonicService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly wordId = input.required<number>();
  readonly wordText = input.required<string>();
  readonly created = output<CreateMnemonicResponse>();

  protected readonly isOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    text: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]],
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
    this.service.create(this.wordId(), { text: this.form.getRawValue().text.trim() }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.isOpen.set(false);
        this.toast.success("Usul qo'shildi");
        this.created.emit(res);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(handleFormError(this.form, err));
      },
    });
  }
}
