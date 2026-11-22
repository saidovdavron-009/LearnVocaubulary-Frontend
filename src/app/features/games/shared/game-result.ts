import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatNumber } from '../../../shared/ui/layout/format';
import { GameResultSaved } from '../games.service';

export interface ResultStat {
  value: string | number;
  label: string;
  tone?: 'mint' | 'blue' | 'violet' | 'coral' | 'yellow';
}

export interface ResultWord {
  en: string;
  uz: string;
  /** true — topilgan, false — topilmagan, undefined — belgisiz. */
  ok?: boolean;
}

const TONES: Record<NonNullable<ResultStat['tone']>, string> = {
  mint: 'bg-mint-soft text-mint-text',
  blue: 'bg-blue-soft text-blue-text',
  violet: 'bg-violet-soft text-violet-text',
  coral: 'bg-coral-soft text-coral-text',
  yellow: 'bg-yellow-soft text-yellow-text',
};

/** Yakka o'yin natijasi: ball, rekord, statistika, XP, so'zlar ro'yxati va tugmalar. */
@Component({
  selector: 'app-game-result',
  imports: [Button, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <section class="pop-in flex w-full max-w-130 flex-col items-center gap-6 rounded-3xl border-2 border-line bg-surface p-6 text-center sm:p-8">
      @if (saved()?.isNewRecord) {
        <span class="inline-flex items-center gap-1.5 rounded-full bg-yellow px-4 py-1.5 text-label text-fg">
          <app-icon name="trophy" [size]="16" /> Yangi rekord!
        </span>
      }
      <div class="flex flex-col gap-1">
        <p class="text-body-lg text-fg-secondary">{{ title() }}</p>
        <p class="font-display text-[64px] leading-none text-violet-text sm:text-[72px]">{{ formatNumber(score()) }}</p>
        <p class="text-body text-fg-muted">ball · rekord {{ formatNumber(saved()?.bestScore ?? score()) }}</p>
      </div>
      @if (stats().length) {
        <div class="grid w-full gap-3" [class]="stats().length >= 3 ? 'grid-cols-3' : 'grid-cols-2'">
          @for (s of stats(); track s.label) {
            <div class="min-w-0 rounded-card p-3" [class]="tone(s.tone)">
              <p class="font-display text-h3 sm:text-h2">{{ s.value }}</p>
              <p class="text-caption">{{ s.label }}</p>
            </div>
          }
        </div>
      }
      @if (saved(); as s) {
        <p class="inline-flex items-center gap-1.5 rounded-lg bg-yellow-soft px-3.5 py-2 text-body-strong text-fg">
          <app-icon name="bolt" [size]="18" class="text-yellow-text" /> +{{ s.xpEarned }} XP
          @if (s.dailyCapReached) {
            <span class="text-caption text-fg-muted">(kunlik o'yin limiti)</span>
          }
        </p>
      } @else if (saveError()) {
        <p class="text-label text-coral-text">{{ saveError() }}</p>
      }
      @if (words().length) {
        <div class="flex max-h-72 w-full flex-col gap-1.5 overflow-y-auto text-left">
          @for (w of words(); track $index) {
            <p class="flex items-start gap-2 text-body text-fg">
              @if (w.ok !== undefined) {
                <app-icon [name]="w.ok ? 'check' : 'x'" [size]="18" class="mt-0.5 shrink-0" [class]="w.ok ? 'text-mint' : 'text-coral-strong'" />
              }
              <span class="min-w-0 [overflow-wrap:anywhere]"><b>{{ w.en }}</b> — {{ w.uz }}</span>
            </p>
          }
        </div>
      }
      <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <a appButton routerLink="/games" variant="secondary" size="m" [block]="true" class="min-w-0">O'yinlar</a>
        <button appButton type="button" size="m" icon="refresh" [block]="true" class="min-w-0" (click)="replay.emit()">Yana o'ynash</button>
      </div>
    </section>
  `,
})
export class GameResult {
  readonly title = input.required<string>();
  readonly score = input.required<number>();
  readonly saved = input<GameResultSaved | null>(null);
  readonly saveError = input<string | null>(null);
  readonly stats = input<ResultStat[]>([]);
  readonly words = input<ResultWord[]>([]);
  readonly replay = output();

  protected readonly formatNumber = formatNumber;

  protected tone(t: ResultStat['tone']): string {
    return TONES[t ?? 'violet'];
  }
}
