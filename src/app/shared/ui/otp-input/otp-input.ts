import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * 6 xonali OTP kod (03 "Emailingizni tekshiring" ekrani).
 * Ichida bitta haqiqiy <input> bor (nusxa qo'yish, SMS/email avto-to'ldirish, ekran o'quvchilar uchun),
 * ustida 6 ta katakcha chiziladi.
 */
@Component({
  selector: 'app-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center gap-2' },
  template: `
    <div class="relative flex gap-2 sm:gap-2.5" (click)="focus()">
      @for (cell of cells(); track $index) {
        <div
          class="flex h-15 w-11 items-center justify-center rounded-input border-2 bg-surface font-display text-h2 text-fg transition-[border-color,box-shadow] duration-150 sm:h-16.5 sm:w-14.5"
          [class]="
            error()
              ? 'border-coral-text'
              : cell.active
                ? 'border-violet shadow-focus'
                : cell.char
                  ? 'border-line-strong'
                  : 'border-line'
          "
          aria-hidden="true"
        >
          @if (cell.char) {
            {{ cell.char }}
          } @else if (cell.active) {
            <span class="h-7 w-0.5 animate-pulse rounded-full bg-violet"></span>
          }
        </div>
      }
      <input
        #field
        [id]="id"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        [attr.maxlength]="length()"
        [attr.aria-label]="label()"
        [attr.aria-invalid]="error() ? true : null"
        [attr.aria-describedby]="error() ? id + '-error' : null"
        [disabled]="disabled()"
        [value]="value()"
        class="absolute inset-0 h-full w-full cursor-text opacity-0"
        (input)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false)"
      />
    </div>
    @if (error()) {
      <p [id]="id + '-error'" class="text-caption text-coral-text">{{ error() }}</p>
    }
  `,
})
export class OtpInput {
  readonly value = model('');
  readonly length = input(6);
  readonly label = input('Tasdiqlash kodi');
  readonly error = input<string | null>(null);
  readonly disabled = input(false);
  /** Barcha xonalar to'lganda chiqadi. */
  readonly completed = output<string>();

  protected readonly id = `app-otp-${nextId++}`;
  protected readonly focused = signal(false);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly cells = computed(() => {
    const value = this.value();
    const activeIndex = Math.min(value.length, this.length() - 1);
    return Array.from({ length: this.length() }, (_, i) => ({
      char: value[i] ?? '',
      active: this.focused() && i === activeIndex && value.length < this.length() + 1 && !value[i],
    }));
  });

  focus(): void {
    this.field().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = el.value.replace(/\D/g, '').slice(0, this.length());
    el.value = digits;
    this.value.set(digits);
    if (digits.length === this.length()) this.completed.emit(digits);
  }
}
