import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * So'zchi logotipi: 40x40 belgi (qattiq soya bilan) — nutq pufakchasi ichida "S" va uchqun — + "So'zchi" yozuvi.
 * tone: "violet" — sayt va ilova; "yellow" — admin panel.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <span
      class="flex size-10 items-center justify-center rounded-lg shadow-hard"
      [class]="
        tone() === 'yellow'
          ? 'bg-yellow shadow-yellow-deep'
          : 'bg-violet shadow-violet-deep'
      "
    >
      <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
        <path
          d="M7 6h12a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5h-8l-5 4v-4.3A5 5 0 0 1 2 17v-6a5 5 0 0 1 5-5Z"
          [attr.fill]="tone() === 'yellow' ? 'var(--color-violet)' : 'var(--color-yellow)'"
        />
        <path
          d="M17.2 10.4c-.7-1-1.9-1.6-3.4-1.6-1.9 0-3.2 1-3.2 2.4 0 3.2 6.8 1.7 6.8 4.9 0 1.5-1.4 2.5-3.5 2.5-1.6 0-2.9-.6-3.6-1.7"
          fill="none"
          stroke-width="2.6"
          stroke-linecap="round"
          [attr.stroke]="tone() === 'yellow' ? 'var(--color-yellow)' : 'var(--color-violet)'"
        />
        <path d="M23 .6l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z" fill="var(--color-coral)" />
      </svg>
    </span>
    <span class="flex flex-col">
      <span class="font-display text-h2" [class]="inverse() ? 'text-fg-inverse' : 'text-fg'">So'zchi</span>
      @if (caption()) {
        <span class="text-caption text-yellow">{{ caption() }}</span>
      }
    </span>
  `,
})
export class Logo {
  readonly tone = input<'violet' | 'yellow'>('violet');
  readonly inverse = input(false);
  readonly caption = input<string | null>(null);
}
