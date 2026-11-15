import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { DeleteMyDeckService } from './delete-my-deck.service';

/** "To'plamni o'chirish" — faqat o'z to'plamim uchun; menyu bandi va tasdiqlash oynasi. */
@Component({
  selector: 'app-delete-my-deck',
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-body-strong text-coral-text hover:bg-coral-soft"
      (click)="isOpen.set(true)"
    >
      <app-icon name="trash" [size]="18" /> To'plamni o'chirish
    </button>
    <app-modal [(open)]="isOpen" title="To'plamni o'chirasizmi?" [description]="'«' + title() + '» butunlay o‘chiriladi. Mening so‘zlarimdagi so‘zlar qoladi.'">
      <div modal-actions class="contents">
        <button appButton type="button" variant="secondary" (click)="isOpen.set(false)">Bekor qilish</button>
        <button appButton type="button" variant="dark" icon="trash" [loading]="busy()" (click)="remove()">O'chirish</button>
      </div>
    </app-modal>
  `,
})
export class DeleteMyDeck {
  private readonly service = inject(DeleteMyDeckService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly deckId = input.required<number>();
  readonly title = input.required<string>();

  protected readonly isOpen = signal(false);
  protected readonly busy = signal(false);

  protected remove(): void {
    this.busy.set(true);
    this.service.delete(this.deckId()).subscribe({
      next: () => {
        this.isOpen.set(false);
        this.toast.success("To'plam o'chirildi");
        void this.router.navigate(['/decks']);
      },
      error: () => this.busy.set(false),
    });
  }
}
