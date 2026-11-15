import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/** Ma'lumot yuklanmaganda ko'rsatiladigan xato holati, "Qayta urinish" tugmasi bilan. */
@Component({
  selector: 'app-error-state',
  imports: [Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center gap-3 px-6 py-12 text-center', role: 'alert' },
  template: `
    <span class="mb-1 flex size-16 items-center justify-center rounded-card bg-coral-soft text-coral-text">
      <app-icon name="alert" [size]="28" />
    </span>
    <p class="font-display text-h3 text-fg">{{ title() }}</p>
    @if (message()) {
      <p class="max-w-md text-body text-fg-muted">{{ message() }}</p>
    }
    <button appButton type="button" variant="secondary" size="m" iconLeft="refresh" class="mt-2" (click)="retry.emit()">
      Qayta urinish
    </button>
  `,
})
export class ErrorState {
  readonly title = input("Ma'lumotni yuklab bo'lmadi");
  readonly message = input<string | null>(null);
  readonly retry = output<void>();
}
