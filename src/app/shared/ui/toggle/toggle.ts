import { ChangeDetectionStrategy, Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Figma: Toggle — On (yalpiz) va Off. 52 × 30, ichida 24px oq tugmacha.
 * <app-toggle formControlName="emailNotifications" label="Email xabarnomalar" />
 * yoki <app-toggle [(checked)]="value" label="..." />
 */
@Component({
  selector: 'app-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Toggle), multi: true }],
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      class="relative h-7.5 w-13 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
      [class]="checked() ? 'bg-mint' : 'bg-line-strong'"
      (click)="toggle()"
    >
      <span
        class="absolute top-0.75 left-0.75 size-6 rounded-full bg-surface shadow-knob transition-transform duration-200"
        [class]="checked() ? 'translate-x-5.5' : 'translate-x-0'"
      ></span>
    </button>
  `,
})
export class Toggle implements ControlValueAccessor {
  readonly checked = model(false);
  /** Ekran o'quvchilar uchun nom (ko'rinadigan label yonida bo'lsa ham bering). */
  readonly label = input.required<string>();

  protected readonly disabled = signal(false);
  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected toggle(): void {
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(value: unknown): void {
    this.checked.set(value === true);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
