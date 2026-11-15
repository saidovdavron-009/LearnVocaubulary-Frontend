import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { controlErrorText } from '../input/control-errors';

export interface SelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
}

let nextId = 0;

/** Ochiladigan ro'yxatning taxminiy maksimal balandligi (px) — pastga sig'masa tepaga ochiladi. */
const PANEL_MAX = 288;

/**
 * Dizayn uslubidagi tanlagich (combobox + listbox). Brauzerning <select> ro'yxati o'rniga
 * o'zimizning ochiladigan ro'yxat: klaviatura (↑ ↓ Home End Enter Esc, harf bilan qidirish), ekran o'quvchilar.
 * size="l" — Input bilan bir xil (52px), size="m" — ixcham (44px), size="s" — sahifalash kabi kichik joylar (40px).
 * Qiymat turi option.value turi bilan bir xil qaytadi (son yoki satr).
 */
@Component({
  selector: 'app-select',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-2',
    '(document:click)': 'onDocumentClick($event)',
    '(window:resize)': 'open() && close()',
    '(document:scroll)': 'onScroll($event)',
  },
  template: `
    @if (label() && !hideLabel()) {
      <label [attr.for]="id" class="text-label text-fg">{{ label() }}</label>
    }
    <div class="relative">
      <button
        #trigger
        type="button"
        role="combobox"
        [id]="id"
        [disabled]="disabled()"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="id + '-list'"
        [attr.aria-activedescendant]="open() && activeIndex() >= 0 ? id + '-opt-' + activeIndex() : null"
        [attr.aria-label]="hideLabel() ? label() : null"
        [attr.aria-invalid]="errorText() ? true : null"
        class="relative flex w-full cursor-pointer items-center border-2 bg-surface text-left text-fg outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-violet focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-60"
        [class]="triggerClasses()"
        (click)="toggle()"
        (keydown)="onKeydown($event)"
        (blur)="onTouched()"
      >
        @if (icon()) {
          <app-icon
            [name]="icon()!"
            [size]="size() === 'l' ? 20 : 18"
            class="pointer-events-none absolute"
            [class]="size() === 'l' ? 'left-4 text-fg-muted' : 'left-3 text-fg'"
          />
        }
        <span class="min-w-0 flex-1 truncate" [class.text-fg-muted]="selectedIndex() < 0">
          {{ selectedIndex() >= 0 ? options()[selectedIndex()].label : (placeholder() ?? '') }}
        </span>
        <app-icon
          name="chevron-down"
          [size]="16"
          class="pointer-events-none absolute text-fg-muted transition-transform duration-150"
          [class]="(size() === 's' ? 'right-2.5' : 'right-3.5') + (open() ? ' rotate-180' : '')"
        />
      </button>

      @if (open()) {
        <ul
          [id]="id + '-list'"
          role="listbox"
          [attr.aria-label]="label()"
          tabindex="-1"
          class="fade-in fixed z-[60] flex flex-col gap-0.5 overflow-y-auto rounded-xl border-2 border-line bg-surface p-1.5 shadow-card"
          [style.left.px]="panelPos().left"
          [style.min-width.px]="panelPos().width"
          [style.top.px]="openUp() ? null : panelPos().top"
          [style.bottom.px]="openUp() ? panelPos().bottom : null"
          [style.max-height.px]="panelMax"
        >
          @for (option of options(); track option.value; let i = $index) {
            <li
              [id]="id + '-opt-' + i"
              role="option"
              [attr.aria-selected]="i === selectedIndex()"
              class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-body-strong whitespace-nowrap"
              [class]="
                i === selectedIndex()
                  ? 'bg-violet-soft text-violet-text'
                  : i === activeIndex()
                    ? 'bg-muted text-fg'
                    : 'text-fg-secondary'
              "
              (mouseenter)="activeIndex.set(i)"
              (mousedown)="$event.preventDefault()"
              (click)="choose(i)"
            >
              {{ option.label }}
              @if (i === selectedIndex()) {
                <app-icon name="check" [size]="16" />
              }
            </li>
          } @empty {
            <li class="px-3 py-2.5 text-body text-fg-muted">Variantlar yo'q</li>
          }
        </ul>
      }
    </div>
    @if (errorText()) {
      <p class="text-caption text-coral-text">{{ errorText() }}</p>
    }
  `,
})
export class Select implements ControlValueAccessor, OnInit {
  readonly label = input.required<string>();
  /** Label ko'rinmaydi, lekin aria-label sifatida qoladi. */
  readonly hideLabel = input(false);
  readonly options = input.required<SelectOption[]>();
  readonly icon = input<IconName | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly size = input<'l' | 'm' | 's'>('l');
  /** Forma'siz ishlatish: [selected]="value" (selectedChange)="value = $event". */
  readonly selected = input<string | number | null | undefined>(undefined);
  readonly selectedChange = output<string | number | null>();

  protected readonly id = `app-select-${nextId++}`;
  protected readonly panelMax = PANEL_MAX;
  protected readonly value = signal<string | number | null>(null);
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);
  protected readonly openUp = signal(false);
  /** Ro'yxat fixed joylashadi — overflow:hidden konteyner yoki modal ichida kesilmaydi. */
  protected readonly panelPos = signal({ left: 0, width: 0, top: 0, bottom: 0 });
  protected readonly activeIndex = signal(-1);
  private readonly controlState = signal(0);
  protected readonly current = computed(() => (this.selected() !== undefined ? this.selected() : this.value()));
  protected readonly selectedIndex = computed(() => this.options().findIndex((o) => o.value === this.current()));

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private changeFn: (value: string | number | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly errorText = computed(() => {
    this.controlState();
    const control = this.ngControl?.control;
    if (!control || !control.invalid || !control.touched) return null;
    return controlErrorText(control.errors);
  });

  protected readonly triggerClasses = computed(() => {
    const size = this.size();
    const box = size === 'l' ? 'h-13 rounded-input text-body font-semibold' : size === 'm' ? 'h-11 rounded-lg text-body-strong' : 'h-10 rounded-md text-body-strong';
    const pl = this.icon() ? (size === 'l' ? 'pl-10.5' : 'pl-9.5') : size === 'l' ? 'pl-4' : size === 'm' ? 'pl-3.5' : 'pl-3';
    const pr = size === 's' ? 'pr-8' : 'pr-9.5';
    const border = this.errorText() ? 'border-coral-text' : this.open() ? 'border-violet shadow-focus' : 'border-line hover:border-line-strong';
    return `${box} ${pl} ${pr} ${border}`;
  });

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    this.ngControl?.control?.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.controlState.update((v) => v + 1));
  }

  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' || typeof value === 'number' ? value : null);
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.changeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  private show(): void {
    if (this.disabled()) return;
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const panel = Math.min(PANEL_MAX, this.options().length * 44 + 16);
    // Pastda joy yetmasa (masalan, sahifa oxiridagi sahifalash) — tepaga ochiladi.
    this.openUp.set(rect.bottom + panel + 8 > window.innerHeight && rect.top > panel + 8);
    this.panelPos.set({ left: rect.left, width: rect.width, top: rect.bottom + 8, bottom: window.innerHeight - rect.top + 8 });
    this.activeIndex.set(Math.max(0, this.selectedIndex()));
    this.open.set(true);
    setTimeout(() => this.scrollActiveIntoView());
  }

  protected close(focus = false): void {
    this.open.set(false);
    if (focus) this.trigger().nativeElement.focus();
  }

  protected choose(index: number): void {
    const option = this.options()[index];
    if (!option) return;
    this.close(true);
    if (option.value === this.current()) return;
    this.value.set(option.value);
    this.changeFn(option.value);
    this.selectedChange.emit(option.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    if (!count) return;
    const move = (index: number) => {
      event.preventDefault();
      if (!this.open()) this.show();
      this.activeIndex.set(Math.min(count - 1, Math.max(0, index)));
      this.scrollActiveIntoView();
    };
    switch (event.key) {
      case 'ArrowDown':
        return move(this.open() ? this.activeIndex() + 1 : Math.max(0, this.selectedIndex()));
      case 'ArrowUp':
        return move(this.open() ? this.activeIndex() - 1 : Math.max(0, this.selectedIndex()));
      case 'Home':
        return move(0);
      case 'End':
        return move(count - 1);
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open()) this.choose(this.activeIndex());
        else this.show();
        return;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation();
          this.close(true);
        }
        return;
      case 'Tab':
        if (this.open()) this.close();
        return;
    }
    // Harf bilan qidirish: yozilgan harflar bilan boshlanadigan birinchi variant.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.typeahead += event.key.toLowerCase();
      clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), 600);
      const found = this.options().findIndex((o) => o.label.toLowerCase().startsWith(this.typeahead));
      if (found >= 0) move(found);
    }
  }

  /** Sahifa scroll bo'lsa ro'yxat yopiladi (fixed ro'yxat tugmadan ajralib qolmasligi uchun); ro'yxatning o'z scrolli bundan mustasno. */
  protected onScroll(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private scrollActiveIntoView(): void {
    document.getElementById(`${this.id}-opt-${this.activeIndex()}`)?.scrollIntoView({ block: 'nearest' });
  }
}
