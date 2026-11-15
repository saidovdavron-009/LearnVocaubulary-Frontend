import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../icon/icon';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end',
  },
  template: `
    <div aria-live="polite" class="contents">
      @for (toast of toasts(); track toast.id) {
        <div
          role="status"
          class="toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-2 bg-surface p-4 shadow-card"
          [class]="
            toast.kind === 'error'
              ? 'border-coral-soft'
              : toast.kind === 'success'
                ? 'border-mint-soft'
                : 'border-line'
          "
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg"
            [class]="
              toast.kind === 'error'
                ? 'bg-coral-soft text-coral-text'
                : toast.kind === 'success'
                  ? 'bg-mint-soft text-mint-text'
                  : 'bg-violet-soft text-violet-text'
            "
          >
            <app-icon [name]="toast.kind === 'error' ? 'alert' : toast.kind === 'success' ? 'check' : 'bell'" [size]="18" />
          </span>
          <p class="flex-1 pt-1 text-body text-fg">{{ toast.message }}</p>
          <button
            type="button"
            class="rounded-xs p-1 text-fg-muted transition-colors hover:text-fg"
            aria-label="Yopish"
            (click)="dismiss(toast.id)"
          >
            <app-icon name="x" [size]="18" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  private readonly service = inject(ToastService);
  protected readonly toasts = this.service.toasts;
  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
