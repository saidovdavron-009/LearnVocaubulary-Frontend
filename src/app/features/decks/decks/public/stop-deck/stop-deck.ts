import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Checkbox } from '../../../../../shared/ui/checkbox/checkbox';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StopDeckResponse } from './stop-deck.models';
import { StopDeckService } from './stop-deck.service';

/** "To'plamni to'xtatish" — menyu bandi va tasdiqlash oynasi. */
@Component({
  selector: 'app-stop-deck',
  imports: [Button, Checkbox, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-body-strong text-fg hover:bg-muted" (click)="isOpen.set(true)">
      <app-icon name="x" [size]="18" /> To'plamni to'xtatish
    </button>
    <app-modal [(open)]="isOpen" title="To'plamni to'xtatasizmi?" description="O'rganilgan so'zlar mening so'zlarimda qoladi.">
      <label class="flex cursor-pointer items-center gap-3 rounded-input bg-page px-4 py-3 text-body text-fg">
        <app-checkbox label="Hali boshlanmagan so'zlarni olib tashlash" [(checked)]="removeNew" />
        <span aria-hidden="true">Hali boshlanmagan (yangi) so'zlarni mening so'zlarimdan olib tashlash</span>
      </label>
      <div modal-actions class="contents">
        <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
        <button appButton type="button" variant="dark" [loading]="busy()" (click)="stop()">To'xtatish</button>
      </div>
    </app-modal>
  `,
})
export class StopDeck {
  private readonly service = inject(StopDeckService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);

  readonly deckId = input.required<number>();
  readonly stopped = output<StopDeckResponse>();

  protected readonly isOpen = signal(false);
  protected readonly removeNew = signal(true);
  protected readonly busy = signal(false);

  protected stop(): void {
    this.busy.set(true);
    this.service.stop(this.deckId(), { removeNewWords: this.removeNew() }).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.isOpen.set(false);
        this.shell.refreshStats();
        this.toast.success("To'plam to'xtatildi");
        this.stopped.emit(res);
      },
      error: () => this.busy.set(false),
    });
  }
}
