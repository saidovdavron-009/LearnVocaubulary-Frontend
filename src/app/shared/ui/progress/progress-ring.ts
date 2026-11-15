import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type RingColor = 'violet' | 'mint' | 'yellow' | 'coral' | 'blue';

const STROKE: Record<RingColor, string> = {
  violet: 'stroke-violet',
  mint: 'stroke-mint',
  yellow: 'stroke-yellow',
  coral: 'stroke-coral-strong',
  blue: 'stroke-blue',
};

/**
 * Halqa (ring) diagramma — Dashboard "Kunlik maqsad" (7/10). Markazdagi matn
 * ng-content orqali beriladi.
 */
@Component({
  selector: 'app-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-label]': 'label()',
    class: 'relative inline-flex items-center justify-center',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    <svg class="absolute inset-0 -rotate-90" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" aria-hidden="true">
      <circle
        class="stroke-muted"
        fill="none"
        [attr.cx]="size() / 2"
        [attr.cy]="size() / 2"
        [attr.r]="radius()"
        [attr.stroke-width]="stroke()"
      />
      <circle
        fill="none"
        stroke-linecap="round"
        class="transition-[stroke-dashoffset] duration-300 ease-out"
        [class]="strokeClass()"
        [attr.cx]="size() / 2"
        [attr.cy]="size() / 2"
        [attr.r]="radius()"
        [attr.stroke-width]="stroke()"
        [attr.stroke-dasharray]="circumference()"
        [attr.stroke-dashoffset]="offset()"
      />
    </svg>
    <div class="relative flex flex-col items-center justify-center text-center">
      <ng-content />
    </div>
  `,
})
export class ProgressRing {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly size = input(130);
  readonly stroke = input(14);
  readonly color = input<RingColor>('mint');
  readonly label = input<string | null>(null);

  protected readonly strokeClass = computed(() => STROKE[this.color()]);
  protected readonly radius = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly offset = computed(() => {
    const max = this.max();
    const ratio = max > 0 ? Math.min(1, Math.max(0, this.value() / max)) : 0;
    return this.circumference() * (1 - ratio);
  });
}
