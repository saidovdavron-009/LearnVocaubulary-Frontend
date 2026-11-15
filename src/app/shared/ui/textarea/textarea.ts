import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { controlErrorText } from '../input/control-errors';

let nextId = 0;

/** Ko'p qatorli matn maydoni — Input bilan bir xil holatlar (Default / Focus / Error). */
@Component({
  selector: 'app-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  template: `
    <label [attr.for]="id" class="text-label text-fg">{{ label() }}</label>
    <textarea
      [id]="id"
      [rows]="rows()"
      [value]="value()"
      [placeholder]="placeholder()"
      [attr.maxlength]="maxlength()"
      [disabled]="disabled()"
      [attr.aria-invalid]="errorText() ? true : null"
      [attr.aria-describedby]="errorText() || helper() ? id + '-hint' : null"
      class="w-full resize-y rounded-input border-2 bg-surface px-4 py-3 text-body font-semibold text-fg transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-fg-muted"
      [class]="errorText() ? 'border-coral-text' : 'border-line focus:border-violet focus:shadow-focus'"
      (input)="onInput($event)"
      (blur)="onBlur()"
    ></textarea>
    @if (errorText() || helper()) {
      <p [id]="id + '-hint'" class="flex justify-between gap-3 text-caption" [class]="errorText() ? 'text-coral-text' : 'text-fg-muted'">
        <span>{{ errorText() ?? helper() }}</span>
        @if (maxlength()) {
          <span class="text-fg-muted">{{ value().length }}/{{ maxlength() }}</span>
        }
      </p>
    }
  `,
})
export class Textarea implements ControlValueAccessor, OnInit {
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly helper = input<string | null>(null);
  readonly rows = input(4);
  readonly maxlength = input<number | null>(null);

  protected readonly id = `app-textarea-${nextId++}`;
  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  private readonly controlState = signal(0);
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private onChange: (v: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly errorText = computed(() => {
    this.controlState();
    const c = this.ngControl?.control;
    return c && c.invalid && c.touched ? controlErrorText(c.errors) : null;
  });

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    this.ngControl?.control?.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.controlState.update((v) => v + 1));
  }

  writeValue(v: unknown): void {
    this.value.set(typeof v === 'string' ? v : '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }

  protected onInput(e: Event): void {
    const v = (e.target as HTMLTextAreaElement).value;
    this.value.set(v);
    this.onChange(v);
  }

  protected onBlur(): void {
    this.onTouched();
    this.controlState.update((v) => v + 1);
  }
}
