import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'soft' | 'yellow';
export type ButtonSize = 'l' | 'm' | 's';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-violet text-fg-inverse shadow-violet-deep',
  secondary: 'border-2 border-line bg-surface text-fg shadow-line',
  dark: 'bg-ink text-fg-inverse shadow-black',
  soft: 'bg-violet-soft text-violet-text shadow-violet-soft-deep',
  yellow: 'bg-yellow text-fg shadow-yellow-deep',
};

/** Figma: L 56px / r16 / 17px, M 44px / r12 / 15px, S 36px / r10 / 13px. */
const SIZES: Record<ButtonSize, { box: string; square: string; icon: number }> = {
  l: { box: 'h-14 gap-2 rounded-xl px-7 text-button', square: 'size-14 rounded-xl', icon: 20 },
  m: { box: 'h-11 gap-2 rounded-lg px-4.5 text-body-strong', square: 'size-11 rounded-lg', icon: 20 },
  s: { box: 'h-9 gap-2 rounded-md px-3.5 text-label', square: 'size-9 rounded-md', icon: 16 },
};

/**
 * Figma: Button — Primary, Secondary, Dark, Soft, Yellow; L, M, S.
 * Haqiqiy <button> yoki <a> elementiga qo'yiladi:
 *   <button appButton variant="primary" size="l" icon="arrow-right">Boshlash</button>
 *   <a appButton routerLink="/decks" variant="soft">To'plamlar</a>
 * Ikonkali (matnsiz) tugmada aria-label majburiy.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.aria-disabled]': 'loading() || null',
  },
  template: `
    @if (loading()) {
      <span
        class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        aria-hidden="true"
      ></span>
    } @else if (iconLeft()) {
      <app-icon [name]="iconLeft()!" [size]="iconSize()" />
    }
    <ng-content />
    @if (icon() && !loading()) {
      <app-icon [name]="icon()!" [size]="iconSize()" />
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('m');
  /** Matndan keyingi ikonka (Figma'dagidek). */
  readonly icon = input<IconName | null>(null);
  /** Matndan oldingi ikonka. */
  readonly iconLeft = input<IconName | null>(null);
  /** Faqat ikonkali kvadrat tugma. */
  readonly iconOnly = input(false);
  readonly block = input(false);
  readonly loading = input(false);

  protected readonly iconSize = computed(() => SIZES[this.size()].icon);

  protected readonly classes = computed(() => {
    const size = SIZES[this.size()];
    return [
      'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-sans',
      'shadow-hard transition-[translate,box-shadow,filter] duration-150 hover:brightness-105',
      'active:translate-y-0.5 active:shadow-hard-sm',
      'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none',
      this.iconOnly() ? size.square : size.box,
      VARIANTS[this.variant()],
      this.block() ? 'w-full' : '',
    ].join(' ');
  });
}
