import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Figma: 08 To'plamlar — muqova ranglari (fon + katta harf rangi), tartib bilan aylanadi. */
const COVERS = [
  { bg: 'bg-yellow', letter: 'text-ink' },
  { bg: 'bg-violet', letter: 'text-yellow' },
  { bg: 'bg-mint', letter: 'text-ink' },
  { bg: 'bg-coral', letter: 'text-ink' },
  { bg: 'bg-ink', letter: 'text-yellow' },
  { bg: 'bg-blue', letter: 'text-ink' },
  { bg: 'bg-yellow-soft', letter: 'text-yellow-text' },
  { bg: 'bg-coral-soft', letter: 'text-coral-text' },
];

/** To'plam id'si bo'yicha doimiy muqova rangi. */
export function deckCoverIndex(id: number): number {
  return Math.abs(id) % COVERS.length;
}

/**
 * To'plam muqovasi: rasm bo'lsa rasm, bo'lmasa rangli fon va sarlavhaning bosh harfi.
 * O'lcham va burchaklar class orqali beriladi: <app-deck-cover class="h-30 rounded-t-3xl" ... />
 */
@Component({
  selector: 'app-deck-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "'relative block overflow-hidden ' + cover().bg", 'aria-hidden': 'true' },
  template: `
    @if (src()) {
      <img [src]="src()" alt="" class="size-full object-cover" />
    } @else {
      <span
        class="absolute font-display font-extrabold tracking-[-2px] opacity-90"
        [class]="
          cover().letter +
          ' ' +
          (centered() ? 'inset-0 flex items-center justify-center leading-[0.8]' : '-top-6.5 right-5.25 leading-[1.05]')
        "
        [style.font-size.px]="letterSize()"
        >{{ letter() }}</span
      >
    }
  `,
})
export class DeckCover {
  readonly deckId = input.required<number>();
  readonly title = input.required<string>();
  readonly src = input<string | null>(null);
  readonly letterSize = input(140);
  /** Harf markazda (09 hero) yoki o'ng pastda (08 kartochka). */
  readonly centered = input(false);
  /** Rang majburan berilishi mumkin (masalan, 09 hero'da ink). */
  readonly variant = input<number | null>(null);

  protected readonly cover = computed(() => COVERS[this.variant() ?? deckCoverIndex(this.deckId())]);
  protected readonly letter = computed(() => this.title().trim().charAt(0).toUpperCase() || '?');
}
