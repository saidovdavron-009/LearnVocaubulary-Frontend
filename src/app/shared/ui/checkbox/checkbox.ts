import { ChangeDetectionStrategy, Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';

/**
 * Jadvallardagi tanlash katakchasi (13 Mening so'zlarim ekranidagidek).
 * <app-checkbox [(checked)]="selected" label="brave so'zini tanlash" />
 */
@Component({
  selector: 'app-checkbox',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Checkbox), multi: true }],
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      role="checkbox"
      [attr.aria-checked]="indeterminate() ? 'mixed' : checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      class="flex size-5 items-center justify-center rounded-xs border-2 transition-colors duration-150 disabled:opacity-50"
      [class]="
        checked() || indeterminate()
          ? 'border-violet bg-violet text-fg-inverse'
          : 'border-line-strong bg-surface hover:border-violet'
      "
      (click)="toggle()"
    >
      @if (checked()) {
        <app-icon name="check" [size]="14" />
      } @else if (indeterminate()) {
        <span class="h-0.5 w-2.5 rounded-full bg-fg-inverse"></span>
      }
    </button>
  `,
})
export class Checkbox implements ControlValueAccessor {
  readonly checked = model(false);
  readonly indeterminate = input(false);
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
