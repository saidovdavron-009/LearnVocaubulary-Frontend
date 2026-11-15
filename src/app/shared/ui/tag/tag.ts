import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TagColor = 'violet' | 'blue' | 'yellow' | 'mint' | 'coral' | 'gray';

const COLORS: Record<TagColor, string> = {
  violet: 'bg-violet-soft text-violet-text',
  blue: 'bg-blue-soft text-blue-text',
  yellow: 'bg-yellow-soft text-yellow-text',
  mint: 'bg-mint-soft text-mint-text',
  coral: 'bg-coral-soft text-coral-text',
  gray: 'bg-muted text-fg-secondary',
};

/** Figma: Tag — Violet, Blue, Yellow, Mint, Coral, Gray. */
@Component({
  selector: 'app-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: `<ng-content />`,
})
export class Tag {
  readonly color = input<TagColor>('gray');
  protected readonly classes = computed(
    () => 'inline-flex items-center whitespace-nowrap rounded-sm px-2.5 py-1.25 text-label ' + COLORS[this.color()],
  );
}
