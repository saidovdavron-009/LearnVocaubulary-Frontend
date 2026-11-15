import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Modal } from '../modal/modal';
import { ConfirmService } from './confirm.service';

/** ConfirmService so'rovlarini ko'rsatadi. app.html'da bir marta joylashadi. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    @let req = service.current();
    <app-modal [open]="!!req" (openChange)="!$event && service.close(false)" [title]="req?.title ?? ''" [width]="440">
      @if (req) {
        <div class="flex items-start gap-3.5">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-input"
            [class]="danger() ? 'bg-coral-soft text-coral-strong' : 'bg-violet-soft text-violet-text'"
            aria-hidden="true"
          >
            <app-icon [name]="danger() ? 'alert' : 'check'" [size]="22" />
          </span>
          <p class="pt-1 text-body-lg text-fg-secondary">
            @if (req.subject) {
              Rostdan ham <strong class="font-extrabold text-fg">{{ req.subject }}</strong> {{ req.message }}
            } @else {
              {{ req.message }}
            }
          </p>
        </div>
      }
      <div modal-actions class="contents">
        <button appButton type="button" variant="secondary" (click)="service.close(false)">{{ req?.cancelText ?? "Yo'q" }}</button>
        <button
          appButton
          type="button"
          [variant]="danger() ? 'dark' : 'primary'"
          [class]="danger() ? '!bg-coral-strong !shadow-coral-text' : ''"
          (click)="service.close(true)"
        >
          {{ req?.confirmText ?? 'Ha' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialog {
  protected readonly service = inject(ConfirmService);
  protected readonly danger = computed(() => (this.service.current()?.tone ?? 'danger') === 'danger');
}
