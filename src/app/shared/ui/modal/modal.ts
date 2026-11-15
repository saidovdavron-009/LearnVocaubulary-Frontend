import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Modal oyna — brauzerning <dialog> elementi asosida (fokus ushlash, Esc, top-layer).
 * <app-modal [(open)]="isOpen" title="To'plam yaratish">
 *   ...kontent...
 *   <div modal-actions> <button appButton>Saqlash</button> </div>
 * </app-modal>
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Yopiq modal joy egallamasin va flex/grid oralig'iga (gap) qo'shilmasin.
  host: { class: 'contents' },
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="modal-enter m-auto w-[calc(100%-2rem)] rounded-3xl border-2 border-line bg-surface p-0 text-fg shadow-card backdrop:bg-ink/40"
      [style.max-width.px]="width()"
      (close)="open.set(false)"
      (click)="onBackdropClick($event)"
    >
      <div class="flex flex-col gap-5 p-6 md:p-7">
        <div class="flex items-start gap-4">
          <div class="flex flex-1 flex-col gap-1">
            <h2 [id]="titleId" class="font-display text-h3 text-fg">{{ title() }}</h2>
            @if (description()) {
              <p class="text-body text-fg-muted">{{ description() }}</p>
            }
          </div>
          <button
            type="button"
            class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-fg-secondary transition-colors hover:text-fg"
            aria-label="Yopish"
            (click)="open.set(false)"
          >
            <app-icon name="x" [size]="18" />
          </button>
        </div>
        <ng-content />
        <div class="flex flex-col-reverse gap-3 empty:hidden sm:flex-row sm:justify-end">
          <ng-content select="[modal-actions]" />
        </div>
      </div>
    </dialog>
  `,
})
export class Modal {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly width = input(520);
  /** Fon bosilganda yopilsinmi. */
  readonly closeOnBackdrop = input(true);

  protected readonly titleId = `app-modal-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      if (!this.open() && el.open) el.close();
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === this.dialog().nativeElement) this.open.set(false);
  }
}
