import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { RemoveDeckWordService } from './remove-deck-word.service';

/** To'plam jadvalidagi "olib tashlash" ikonka tugmasi (faqat o'z to'plamim uchun). */
@Component({
  selector: 'app-remove-deck-word',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      class="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-coral-soft hover:text-coral-text disabled:opacity-50"
      [disabled]="busy()"
      [attr.aria-label]="label() + ' so‘zini to‘plamdan olib tashlash'"
      (click)="remove()"
    >
      <app-icon name="trash" [size]="18" />
    </button>
  `,
})
export class RemoveDeckWord {
  private readonly service = inject(RemoveDeckWordService);
  private readonly toast = inject(ToastService);

  readonly deckId = input.required<number>();
  readonly wordId = input.required<number>();
  readonly label = input.required<string>();
  readonly removed = output<number>();

  protected readonly busy = signal(false);

  protected remove(): void {
    this.busy.set(true);
    this.service.remove(this.deckId(), this.wordId()).subscribe({
      next: () => {
        this.toast.success(`«${this.label()}» to'plamdan olib tashlandi`);
        this.removed.emit(this.wordId());
      },
      error: () => this.busy.set(false),
    });
  }
}
