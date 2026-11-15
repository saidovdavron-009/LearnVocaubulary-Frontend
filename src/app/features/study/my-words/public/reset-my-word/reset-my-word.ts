import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { ResetMyWordResponse } from './reset-my-word.models';
import { ResetMyWordService } from './reset-my-word.service';

/** Menyu bandi: "Progressni qayta boshlash". */
@Component({
  selector: 'app-reset-my-word',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-body-strong text-fg hover:bg-muted" (click)="reset()">
      <app-icon name="refresh" [size]="18" /> Progressni qayta boshlash
    </button>
  `,
})
export class ResetMyWord {
  private readonly service = inject(ResetMyWordService);
  private readonly toast = inject(ToastService);

  readonly wordId = input.required<number>();
  readonly done = output<ResetMyWordResponse>();

  protected reset(): void {
    this.service.reset(this.wordId()).subscribe((res) => {
      this.toast.success('Progress qayta boshlandi');
      this.done.emit(res);
    });
  }
}
