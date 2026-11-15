import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { controlErrorText } from './control-errors';

let nextId = 0;

/**
 * Figma: Input — Default, Focus (binafsha chegara va halqa), Error (marjon chegara va xato matni).
 * Reactive Forms bilan: <app-input label="Email" icon="mail" formControlName="email" />
 * Xato control "touched" bo'lgach ko'rinadi; backend xatosi "server" kaliti orqali keladi.
 */
@Component({
  selector: 'app-input',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  template: `
    @if (label()) {
      <label [attr.for]="id" class="text-label text-fg">{{ label() }}</label>
    }
    <div
      class="flex h-13 items-center gap-2.5 rounded-input border-2 bg-surface px-4 transition-[border-color,box-shadow] duration-150"
      [class]="
        errorText()
          ? 'border-coral-text'
          : 'border-line focus-within:border-violet focus-within:shadow-focus'
      "
      [class.opacity-60]="disabled()"
    >
      @if (icon()) {
        <app-icon [name]="icon()!" [size]="20" class="text-fg-muted" />
      }
      <input
        [id]="id"
        [type]="inputType()"
        [value]="value()"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.inputmode]="inputmode()"
        [attr.maxlength]="maxlength()"
        [disabled]="disabled()"
        [attr.aria-invalid]="errorText() ? true : null"
        [attr.aria-describedby]="errorText() || helper() ? id + '-hint' : null"
        class="min-w-0 flex-1 bg-transparent text-body font-semibold text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed"
        (input)="onInput($event)"
        (blur)="onBlur()"
      />
      @if (type() === 'password') {
        <button
          type="button"
          class="-mr-1 rounded-xs p-1 text-fg-muted transition-colors hover:text-fg"
          [attr.aria-label]="showPassword() ? 'Parolni yashirish' : 'Parolni ko‘rsatish'"
          [attr.aria-pressed]="showPassword()"
          (click)="showPassword.set(!showPassword())"
        >
          <app-icon name="eye" [size]="20" />
        </button>
      }
    </div>
    @if (errorText() || helper()) {
      <p [id]="id + '-hint'" class="text-caption" [class]="errorText() ? 'text-coral-text' : 'text-fg-muted'">
        {{ errorText() ?? helper() }}
      </p>
    }
  `,
})
export class Input implements ControlValueAccessor, OnInit {
  readonly label = input<string | null>(null);
  readonly icon = input<IconName | null>(null);
  readonly type = input<'text' | 'email' | 'password' | 'search' | 'number' | 'tel' | 'url'>('text');
  readonly placeholder = input('');
  readonly helper = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  /** Forma'siz ishlatilganda tashqaridan xato matni. */
  readonly error = input<string | null>(null);
  /** Validator kalitlari uchun maxsus matnlar: { required: 'Emailni kiriting' } */
  readonly errorMessages = input<Record<string, string>>({});

  protected readonly id = `app-input-${nextId++}`;
  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly showPassword = signal(false);
  private readonly controlState = signal(0);

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.showPassword() ? 'text' : this.type(),
  );

  protected readonly errorText = computed(() => {
    if (this.error()) return this.error();
    this.controlState();
    const control = this.ngControl?.control;
    if (!control || !control.invalid || !control.touched) return null;
    return controlErrorText(control.errors, this.errorMessages());
  });

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    // Control holati (touched, errors) o'zgarganda xato matnini qayta hisoblash.
    this.ngControl?.control?.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.controlState.update((v) => v + 1));
  }

  writeValue(value: unknown): void {
    this.value.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    // Foydalanuvchi yozishni boshlasa, eski backend xatosi olib tashlanadi.
    const control = this.ngControl?.control;
    if (control?.hasError('server')) {
      const { server: _server, ...rest } = control.errors ?? {};
      control.setErrors(Object.keys(rest).length ? rest : null);
    }
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
    this.controlState.update((v) => v + 1);
  }
}
