import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CefrLevel } from '../../../../../core/api/enums';
import { handleFormError } from '../../../../../core/api/problem-details';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Input } from '../../../../../shared/ui/input/input';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ui/select/select';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { Toggle } from '../../../../../shared/ui/toggle/toggle';
import { CreateMyDeckService } from './create-my-deck.service';

const CEFR_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Darajasiz' },
  ...(['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as CefrLevel[]).map((l) => ({ value: l, label: l.toUpperCase() })),
];

/** Figma: 08 — "Yangi to'plam +" tugmasi va yaratish oynasi (POST /api/decks). */
@Component({
  selector: 'app-create-my-deck',
  imports: [ReactiveFormsModule, Alert, Button, Input, Modal, Select, Toggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button appButton type="button" icon="plus" (click)="open()">Yangi to'plam</button>

    <app-modal [(open)]="isOpen" title="Yangi to'plam" description="So'zlarni o'zingizga qulay guruhlarga ajrating.">
      <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="submit()">
        @if (error()) {
          <app-alert>{{ error() }}</app-alert>
        }
        <app-input label="Nomi" placeholder="Masalan: Mening oshxona so'zlarim" formControlName="title" />
        <app-input label="Tavsif" placeholder="Ixtiyoriy" formControlName="description" />
        <div class="grid gap-4 sm:grid-cols-2">
          <app-select label="Til" icon="book" placeholder="Tanlang" [options]="languages()" formControlName="languageId" />
          <app-select label="Daraja" icon="target" [options]="cefrOptions" formControlName="cefrLevel" />
        </div>
        <label class="flex items-center justify-between gap-4 rounded-input bg-page px-4 py-3">
          <span class="flex flex-col">
            <span class="text-body-strong text-fg">Ommaviy to'plam</span>
            <span class="text-caption text-fg-muted">Boshqa foydalanuvchilar ham ko'ra oladi</span>
          </span>
          <app-toggle label="Ommaviy to'plam" formControlName="isPublic" />
        </label>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
          <button appButton type="submit" icon="check" [loading]="saving()">Yaratish</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CreateMyDeck {
  private readonly service = inject(CreateMyDeckService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly cefrOptions = CEFR_OPTIONS;
  protected readonly languages = signal<SelectOption<number>[]>([]);
  protected readonly isOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(5000)]],
    languageId: this.fb.control<number | null>(null, Validators.required),
    cefrLevel: [''],
    isPublic: [false],
  });

  protected open(): void {
    this.form.reset();
    this.error.set(null);
    this.isOpen.set(true);
    this.service.options().subscribe(({ languages, defaultLanguageId }) => {
      this.languages.set(languages.map((l) => ({ value: l.id, label: l.name })));
      if (defaultLanguageId && this.form.controls.languageId.value === null) {
        this.form.controls.languageId.setValue(defaultLanguageId);
      }
    });
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .create({
        languageId: v.languageId as number,
        title: v.title.trim(),
        description: v.description.trim() || null,
        cefrLevel: (v.cefrLevel || null) as CefrLevel | null,
        isPublic: v.isPublic,
      })
      .subscribe({
        next: (deck) => {
          this.saving.set(false);
          this.isOpen.set(false);
          this.toast.success("To'plam yaratildi");
          void this.router.navigate(['/decks', deck.id]);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(handleFormError(this.form, err));
        },
      });
  }
}
