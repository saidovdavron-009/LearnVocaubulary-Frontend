import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CefrLevel } from '../../../../../core/api/enums';
import { handleFormError } from '../../../../../core/api/problem-details';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ImagePicker } from '../../../../../shared/ui/image-picker/image-picker';
import { Input } from '../../../../../shared/ui/input/input';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ui/select/select';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { Toggle } from '../../../../../shared/ui/toggle/toggle';
import { EditableDeck, UpdateMyDeckResponse } from './update-my-deck.models';
import { UpdateMyDeckService } from './update-my-deck.service';

const CEFR_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Darajasiz' },
  ...(['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as CefrLevel[]).map((l) => ({ value: l, label: l.toUpperCase() })),
];

/** "Tahrirlash" — o'z to'plamim uchun; menyu bandi va tahrirlash oynasi (PUT /api/decks/{id}). */
@Component({
  selector: 'app-update-my-deck',
  imports: [ReactiveFormsModule, Alert, Button, Icon, ImagePicker, Input, Modal, Select, Toggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-body-strong text-fg hover:bg-muted" (click)="open()">
      <app-icon name="edit" [size]="18" /> Tahrirlash
    </button>
    <app-modal [(open)]="isOpen" title="To'plamni tahrirlash">
      <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="submit()">
        @if (error()) {
          <app-alert>{{ error() }}</app-alert>
        }
        <app-input label="Nomi" formControlName="title" />
        <app-input label="Tavsif" placeholder="Ixtiyoriy" formControlName="description" />
        <app-image-picker label="Muqova rasmi" formControlName="coverUrl" />
        <app-select label="Daraja" icon="target" [options]="cefrOptions" formControlName="cefrLevel" />
        <label class="flex items-center justify-between gap-4 rounded-input bg-page px-4 py-3">
          <span class="flex flex-col">
            <span class="text-body-strong text-fg">Ommaviy to'plam</span>
            <span class="text-caption text-fg-muted">Boshqa foydalanuvchilar ham ko'ra oladi</span>
          </span>
          <app-toggle label="Ommaviy to'plam" formControlName="isPublic" />
        </label>
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
          <button appButton type="submit" icon="check" [loading]="saving()">Saqlash</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class UpdateMyDeck {
  private readonly service = inject(UpdateMyDeckService);
  private readonly toast = inject(ToastService);

  readonly deck = input.required<EditableDeck>();
  readonly updated = output<UpdateMyDeckResponse>();

  protected readonly cefrOptions = CEFR_OPTIONS;
  protected readonly isOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(5000)]],
    cefrLevel: [''],
    coverUrl: this.fb.control<string | null>(null),
    isPublic: [false],
  });

  protected open(): void {
    const d = this.deck();
    this.form.reset({
      title: d.title,
      description: d.description ?? '',
      cefrLevel: d.cefrLevel ?? '',
      coverUrl: d.coverUrl,
      isPublic: d.isPublic,
    });
    this.error.set(null);
    this.isOpen.set(true);
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
      .update(this.deck().id, {
        title: v.title.trim(),
        description: v.description.trim() || null,
        cefrLevel: (v.cefrLevel || null) as CefrLevel | null,
        coverUrl: v.coverUrl,
        isPublic: v.isPublic,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.isOpen.set(false);
          this.toast.success("To'plam saqlandi");
          this.updated.emit(res);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(handleFormError(this.form, err));
        },
      });
  }
}
