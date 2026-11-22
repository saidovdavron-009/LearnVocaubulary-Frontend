import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiUrl } from '../../../core/api/api-url';
import { problemMessage } from '../../../core/api/problem-details';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/http-context';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Swagger: POST /api/uploads/images → UploadImageResponse */
interface UploadImageResponse {
  id: string;
  /** Nisbiy manzil: "/api/uploads/images/{id}". */
  url: string;
}

/**
 * Rasm tanlash: kompyuterdan yuklash (POST /api/uploads/images) yoki https URL kiritish.
 * Qiymati — rasm manzili yoki null: <app-image-picker label="Muqova rasmi" formControlName="coverUrl" />
 */
@Component({
  selector: 'app-image-picker',
  imports: [ReactiveFormsModule, Button, Icon, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: ImagePicker, multi: true }],
  host: { class: 'flex flex-col gap-2' },
  template: `
    @if (label()) {
      <span class="text-label text-fg">{{ label() }}</span>
    }
    <input
      #fileInput
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      (change)="onFileSelected($event)"
    />
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-muted text-fg-muted transition-colors hover:border-violet disabled:opacity-60"
        [attr.aria-label]="value() ? 'Rasmni almashtirish' : 'Rasm tanlash'"
        [disabled]="disabled() || uploading()"
        (click)="fileInput.click()"
      >
        @if (value()) {
          <img [src]="value()" alt="" class="size-full object-cover" />
        } @else {
          <app-icon name="plus" [size]="22" />
        }
      </button>
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="flex flex-wrap gap-2">
          <button
            appButton
            type="button"
            variant="secondary"
            size="s"
            [loading]="uploading()"
            [disabled]="disabled()"
            (click)="fileInput.click()"
          >
            Kompyuterdan
          </button>
          <button
            appButton
            type="button"
            variant="secondary"
            size="s"
            [disabled]="disabled() || uploading()"
            (click)="toggleUrl()"
          >
            URL orqali
          </button>
          @if (value()) {
            <button
              type="button"
              class="flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-coral-text"
              aria-label="Rasmni olib tashlash"
              [disabled]="disabled() || uploading()"
              (click)="setValue(null)"
            >
              <app-icon name="trash" [size]="18" />
            </button>
          }
        </div>
        <p class="text-caption" [class]="error() ? 'text-coral-text' : 'text-fg-muted'">
          {{ error() ?? 'Ixtiyoriy · JPG, PNG, WEBP yoki GIF, 2 MB gacha' }}
        </p>
      </div>
    </div>
    @if (urlOpen()) {
      <div class="flex items-start gap-2">
        <app-input
          class="flex-1"
          icon="link"
          type="url"
          placeholder="https://..."
          [formControl]="urlControl"
          [errorMessages]="{ pattern: 'Manzil https:// bilan boshlanishi kerak' }"
          (keydown.enter)="$event.preventDefault(); applyUrl()"
        />
        <button appButton type="button" size="s" class="mt-2.5" (click)="applyUrl()">Qo'shish</button>
      </div>
    }
  `,
})
export class ImagePicker implements ControlValueAccessor {
  private readonly http = inject(HttpClient);

  readonly label = input<string | null>(null);

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly urlOpen = signal(false);
  protected readonly urlControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(2000), Validators.pattern(/^https:\/\/.+/)],
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value || null);
    this.error.set(null);
    this.urlOpen.set(false);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected setValue(value: string | null): void {
    this.value.set(value);
    this.error.set(null);
    this.onChange(value);
    this.onTouched();
  }

  protected toggleUrl(): void {
    const current = this.value();
    this.urlControl.reset(current?.startsWith('https://') ? current : '');
    this.urlOpen.set(!this.urlOpen());
  }

  protected applyUrl(): void {
    if (this.urlControl.invalid) {
      this.urlControl.markAsTouched();
      return;
    }
    const url = this.urlControl.value.trim();
    this.setValue(url || null);
    this.urlOpen.set(false);
  }

  protected onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = ''; // shu faylni qayta tanlash ham ishlasin
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      this.error.set('Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.error.set('Rasm hajmi 2 MB dan oshmasligi kerak.');
      return;
    }

    const body = new FormData();
    body.append('file', file);
    this.error.set(null);
    this.uploading.set(true);
    this.http
      .post<UploadImageResponse>(apiUrl('/uploads/images'), body, {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({
        next: (res) => {
          this.uploading.set(false);
          this.urlOpen.set(false);
          this.setValue(res.url);
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.error.set(problemMessage(err));
        },
      });
  }
}
