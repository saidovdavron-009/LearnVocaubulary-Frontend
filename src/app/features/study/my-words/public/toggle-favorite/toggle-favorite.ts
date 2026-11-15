import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ToggleFavoriteService } from './toggle-favorite.service';

/** Sevimli (yurak) tugmasi — faqat mening so'zlarimdagi so'z uchun. */
@Component({
  selector: 'app-toggle-favorite',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      class="flex items-center justify-center rounded-input transition-colors disabled:opacity-60"
      [class]="(favorite() ? 'bg-coral-soft text-coral-strong ' : 'bg-muted text-fg-secondary hover:text-fg ') + sizeClass()"
      [disabled]="busy()"
      [attr.aria-pressed]="favorite()"
      [attr.aria-label]="favorite() ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'"
      (click)="toggle()"
    >
      <app-icon name="heart" [size]="20" [class]="favorite() ? '[&_path]:fill-coral-strong' : ''" />
    </button>
  `,
})
export class ToggleFavorite {
  private readonly service = inject(ToggleFavoriteService);

  readonly wordId = input.required<number>();
  readonly isFavorite = input(false);
  readonly sizeClass = input('size-10');
  readonly changed = output<boolean>();

  protected readonly favorite = linkedSignal(() => this.isFavorite());
  protected readonly busy = signal(false);

  protected toggle(): void {
    this.busy.set(true);
    this.service.toggle(this.wordId()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.favorite.set(res.isFavorite);
        this.changed.emit(res.isFavorite);
      },
      error: () => this.busy.set(false),
    });
  }
}
