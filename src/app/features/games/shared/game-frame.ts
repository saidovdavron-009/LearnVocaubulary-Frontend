import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/ui/icon/icon';
import { ErrorState } from '../../../shared/ui/state/error-state';

export type GamePhase = 'loading' | 'error' | 'ready' | 'playing' | 'saving' | 'done';

/**
 * Yakka o'yinlar uchun umumiy qobiq: tepada yopish tugmasi, progress va chiplar (`[chips]` slot),
 * pastda yuklanish/xato/saqlash holatlari. Qolgan holatlarda o'yinning o'z kontenti ko'rsatiladi.
 */
@Component({
  selector: 'app-game-frame',
  imports: [Icon, ErrorState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-page' },
  template: `
    <header class="flex items-center gap-3 px-4 py-4 md:gap-5 md:px-12 md:py-6">
      <a
        routerLink="/games"
        class="flex size-12 shrink-0 items-center justify-center rounded-input border-2 border-line bg-surface text-fg transition-colors hover:bg-muted"
        aria-label="O'yinlarga qaytish"
      >
        <app-icon name="x" [size]="22" />
      </a>
      @if (progress() !== null) {
        <div class="h-4 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" [attr.aria-label]="progressLabel()" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progress()! * 100">
          <div class="h-full rounded-full transition-[width] duration-300" [class]="barClass()" [style.width.%]="progress()! * 100"></div>
        </div>
      } @else {
        <span class="flex-1"></span>
      }
      <ng-content select="[chips]" />
    </header>

    <main class="flex flex-1 flex-col items-center justify-center px-4 pb-10">
      @switch (phase()) {
        @case ('loading') {
          <div class="flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            {{ loadingText() }}
          </div>
        }
        @case ('error') {
          <div class="w-full max-w-130 rounded-2xl border-2 border-line bg-surface">
            <app-error-state title="O'yinni boshlab bo'lmadi" [message]="error()" (retry)="retry.emit()" />
          </div>
        }
        @case ('saving') {
          <div class="flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            Natija saqlanmoqda...
          </div>
        }
        @default {
          <ng-content />
        }
      }
    </main>
  `,
})
export class GameFrame {
  readonly phase = input.required<GamePhase>();
  readonly error = input<string | null>(null);
  /** 0..1, null — progress chizig'i ko'rsatilmaydi. */
  readonly progress = input<number | null>(null);
  readonly progressLabel = input('Progress');
  readonly barClass = input('bg-violet');
  readonly loadingText = input("So'zlar tayyorlanmoqda...");
  readonly retry = output();
}
