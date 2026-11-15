import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Figma: Tab — Default va Active (to'q fon, sariq hisoblagich).
 * Guruh konteyneriga role="tablist" qo'ying:
 *   <div role="tablist"><button appTab [active]="..." [count]="7">Hammasi</button></div>
 */
@Component({
  selector: 'button[appTab]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    role: 'tab',
    '[attr.aria-selected]': 'active()',
    '[class]': 'classes()',
  },
  template: `
    <ng-content />
    @if (count() !== null) {
      <span
        class="rounded-full px-1.75 py-0.5 text-caption"
        [class]="active() ? 'bg-yellow text-fg' : 'bg-muted text-fg-secondary'"
      >
        {{ count() }}
      </span>
    }
  `,
})
export class Tab {
  readonly active = input(false);
  readonly count = input<number | null>(null);

  protected readonly classes = computed(() =>
    [
      'inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 px-3.5 text-label transition-colors',
      this.active()
        ? 'border-ink bg-ink text-fg-inverse'
        : 'border-line bg-surface text-fg-secondary hover:border-line-strong hover:text-fg',
    ].join(' '),
  );
}
