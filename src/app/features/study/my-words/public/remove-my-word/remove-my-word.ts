import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { RemoveMyWordService } from './remove-my-word.service';

/** Menyu bandi: "Mening so'zlarimdan o'chirish". */
@Component({
  selector: 'app-remove-my-word',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-body-strong text-coral-text hover:bg-coral-soft"
      (click)="remove()"
    >
      <app-icon name="trash" [size]="18" /> Mening so'zlarimdan o'chirish
    </button>
  `,
})
export class RemoveMyWord {
  private readonly service = inject(RemoveMyWordService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);

  readonly wordId = input.required<number>();
  readonly removed = output<number>();

  protected remove(): void {
    this.service.remove(this.wordId()).subscribe(() => {
      this.toast.success("So'z mening so'zlarimdan o'chirildi");
      this.shell.refreshStats();
      this.removed.emit(this.wordId());
    });
  }
}
