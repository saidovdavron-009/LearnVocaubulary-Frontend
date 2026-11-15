import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarColor = 'violet' | 'yellow' | 'coral' | 'mint' | 'blue';

const COLORS: Record<AvatarColor, string> = {
  violet: 'bg-violet text-fg-inverse',
  yellow: 'bg-yellow text-fg',
  coral: 'bg-coral text-fg',
  mint: 'bg-mint text-fg',
  blue: 'bg-blue text-fg',
};
const ORDER: AvatarColor[] = ['violet', 'yellow', 'coral', 'mint', 'blue'];

/** Ism bo'yicha doimiy rang (bir user har doim bir xil rangda). */
export function avatarColorFor(seed: string): AvatarColor {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return ORDER[Math.abs(hash) % ORDER.length];
}

/** Figma: Avatar — 5 rang, ichida bosh harf. Rasm bo'lsa rasm ko'rsatiladi. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'fontSize()',
  },
  template: `
    @if (src()) {
      <img [src]="src()" [alt]="name()" class="size-full object-cover" />
    } @else {
      <span aria-hidden="true">{{ initial() }}</span>
      <span class="sr-only">{{ name() }}</span>
    }
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly src = input<string | null>(null);
  /** Berilmasa ism bo'yicha avtomatik tanlanadi. */
  readonly color = input<AvatarColor | null>(null);
  /** px. Figma: 40 (standart), 44 (topbar). */
  readonly size = input(40);

  protected readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase() || '?');
  protected readonly fontSize = computed(() => Math.round(this.size() * 0.375));
  protected readonly classes = computed(
    () =>
      'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-extrabold leading-none ' +
      COLORS[this.color() ?? avatarColorFor(this.name())],
  );
}
