import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { DeleteMyMnemonicService } from './delete-my-mnemonic.service';

/** O'zim qo'shgan eslab qolish usulini o'chirish tugmasi. */
@Component({
  selector: 'app-delete-my-mnemonic',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      class="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-coral-soft hover:text-coral-text disabled:opacity-50"
      aria-label="Usulni o'chirish"
      [disabled]="busy()"
      (click)="remove()"
    >
      <app-icon name="trash" [size]="16" />
    </button>
  `,
})
export class DeleteMyMnemonic {
  private readonly service = inject(DeleteMyMnemonicService);
  private readonly toast = inject(ToastService);

  readonly mnemonicId = input.required<number>();
  readonly deleted = output<number>();

  protected readonly busy = signal(false);

  protected remove(): void {
    this.busy.set(true);
    this.service.delete(this.mnemonicId()).subscribe({
      next: () => {
        this.toast.success("Usul o'chirildi");
        this.deleted.emit(this.mnemonicId());
      },
      error: () => this.busy.set(false),
    });
  }
}
