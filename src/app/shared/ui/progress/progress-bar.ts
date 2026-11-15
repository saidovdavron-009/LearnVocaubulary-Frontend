import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProgressColor = 'violet' | 'mint' | 'yellow' | 'coral' | 'blue';

const FILL: Record<ProgressColor, string> = {
  violet: 'bg-violet',
  mint: 'bg-mint',
  yellow: 'bg-yellow',
  coral: 'bg-coral-strong',
  blue: 'bg-blue',
};

/** Chiziqli progress (Dashboard to'plamlari, Mening so'zlarim "Xotira" ustuni). */
@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-label]': 'label()',
    class: 'block overflow-hidden rounded-full bg-muted',
    '[style.height.px]': 'height()',
  },
  template: `
    <div
      class="h-full rounded-full transition-[width] duration-300 ease-out"
      [class]="fill()"
      [style.width.%]="percent()"
    ></div>
  `,
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly color = input<ProgressColor>('violet');
  readonly height = input(8);
  readonly label = input<string | null>(null);

  protected readonly fill = computed(() => FILL[this.color()]);
  protected readonly percent = computed(() => {
    const max = this.max();
    if (max <= 0) return 0;
    return Math.min(100, Math.max(0, (this.value() / max) * 100));
  });
}
