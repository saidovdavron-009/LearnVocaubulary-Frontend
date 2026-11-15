import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Bo'sh ro'yxat holati. Amal tugmasi ng-content orqali:
 * <app-empty-state icon="layers" title="Hali to'plam yo'q" text="...">
 *   <button appButton>To'plam yaratish</button>
 * </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center gap-3 px-6 py-12 text-center' },
  template: `
    <span class="mb-1 flex size-16 items-center justify-center rounded-card bg-violet-soft text-violet-text">
      <app-icon [name]="icon()" [size]="28" />
    </span>
    <p class="font-display text-h3 text-fg">{{ title() }}</p>
    @if (text()) {
      <p class="max-w-md text-body text-fg-muted">{{ text() }}</p>
    }
    <div class="mt-2 flex flex-wrap justify-center gap-3 empty:hidden">
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly icon = input<IconName>('search');
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
}
