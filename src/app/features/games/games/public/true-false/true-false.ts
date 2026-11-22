import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord } from '../../../games.service';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult } from '../../../shared/game-result';
import { SoloGame, uniqueWords } from '../../../shared/solo-game';

const DURATION_MS = 60_000;

interface Card {
  word: GameWord;
  shown: string;
  truth: boolean;
}

/**
 * To'g'ri yoki noto'g'ri: "apple = olma" — 60 soniyada iloji boricha ko'p kartochkaga tez javob.
 * Ball: to'g'ri — 10 + kombo (ketma-ket to'g'ri javoblar uchun +2 dan, ko'pi bilan +20). Xato — kombo nolga tushadi.
 */
@Component({
  selector: 'app-true-false',
  imports: [Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:keydown)': 'onKey($event)' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? timeLeft() / 60 : null" barClass="bg-yellow" (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg py-2.5 pr-3.5 pl-3 text-body-strong" [class]="timeLeft() <= 10 ? 'bg-coral-soft text-coral-text' : 'bg-blue-soft text-blue-text'">
            <app-icon name="clock" [size]="18" /> {{ timeLeft() }}
          </span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
            <app-icon name="star" [size]="18" class="text-yellow-text" /> {{ score() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('ready') {
          <app-game-intro
            title="To'g'ri yoki noto'g'ri"
            text="So'z va tarjima ko'rsatiladi. To'g'ri juftmi? 60 soniyada iloji boricha ko'p javob bering!"
            icon="bolt"
            iconClass="bg-yellow text-fg"
            [rules]="rules"
            (start)="start()"
          />
        }
        @case ('playing') {
          @if (current(); as c) {
            <section class="flex w-full max-w-130 flex-col items-center gap-7">
              <div class="flex h-9 items-center">
                @if (combo() >= 3) {
                  <span class="pop-in inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3.5 py-1.5 text-label text-coral-text">
                    <app-icon name="flame" [size]="16" /> {{ combo() }}x kombo!
                  </span>
                }
              </div>
              @for (k of [count()]; track k) {
              <div
                class="pop-in flex w-full flex-col items-center gap-3 rounded-3xl border-2 bg-surface px-6 py-10 text-center transition-colors"
                [class]="flash() === 'ok' ? 'border-mint bg-mint-soft' : flash() === 'bad' ? 'shake border-coral-strong bg-coral-soft' : 'border-line'"
              >
                <p class="font-display text-h1 text-fg [overflow-wrap:anywhere]">{{ c.word.text }}</p>
                <p class="text-h3 text-fg-muted">=</p>
                <p class="font-display text-h2 text-violet-text [overflow-wrap:anywhere]">{{ c.shown }}</p>
              </div>
              }
              <div class="grid w-full grid-cols-2 gap-4">
                <button
                  type="button"
                  class="flex h-20 items-center justify-center gap-2 rounded-card border-2 border-coral-strong bg-coral-soft text-coral-text shadow-coral-strong transition-[translate,box-shadow] active:translate-y-0.5 active:shadow-hard-sm"
                  aria-label="Noto'g'ri"
                  (click)="answer(false)"
                >
                  <app-icon name="x" [size]="36" />
                </button>
                <button
                  type="button"
                  class="flex h-20 items-center justify-center gap-2 rounded-card border-2 border-mint bg-mint-soft text-mint-text shadow-mint transition-[translate,box-shadow] active:translate-y-0.5 active:shadow-hard-sm"
                  aria-label="To'g'ri"
                  (click)="answer(true)"
                >
                  <app-icon name="check" [size]="36" />
                </button>
              </div>
              <p class="hidden text-caption text-fg-muted sm:block">← noto'g'ri · → to'g'ri</p>
            </section>
          }
        }
        @case ('done') {
          <app-game-result
            title="Vaqt tugadi!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: right(), label: 'to\\'g\\'ri', tone: 'mint' },
              { value: wrongCount(), label: 'xato', tone: 'coral' },
              { value: bestCombo(), label: 'eng uzun kombo', tone: 'yellow' }
            ]"
            (replay)="load()"
          />
        }
      }
    </app-game-frame>
  `,
})
export class TrueFalse extends SoloGame {
  protected readonly gameType = 'true_false' as const;
  protected readonly rules: GameRule[] = [
    { icon: 'check', text: "To'g'ri javob — 10 ball, ketma-ket javoblar uchun kombo bonusi" },
    { icon: 'x', text: 'Xato — kombo nolga tushadi', tone: 'coral' },
    { icon: 'keyboard', text: '← va → strelkalari bilan ham javob bering', tone: 'violet' },
  ];

  private pool: GameWord[] = [];
  protected readonly current = signal<Card | null>(null);
  protected readonly count = signal(0);
  protected readonly score = signal(0);
  protected readonly combo = signal(0);
  protected readonly bestCombo = signal(0);
  protected readonly right = signal(0);
  protected readonly wrongCount = signal(0);
  protected readonly flash = signal<'ok' | 'bad' | null>(null);
  protected readonly timeLeft = computed(() => Math.max(0, Math.ceil((DURATION_MS - this.elapsedMs()) / 1000)));

  private lastIndex = -1;

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.fetchWords(60, (list) => {
      this.pool = uniqueWords(list, (w) => w.distractors.length > 0);
      return this.pool.length >= 8;
    });
  }

  protected start(): void {
    this.score.set(0);
    this.combo.set(0);
    this.bestCombo.set(0);
    this.right.set(0);
    this.wrongCount.set(0);
    this.phase.set('playing');
    this.startClock();
    this.later(() => this.end(), DURATION_MS);
    this.nextCard();
  }

  private nextCard(): void {
    let i = Math.floor(Math.random() * this.pool.length);
    if (i === this.lastIndex) i = (i + 1) % this.pool.length;
    this.lastIndex = i;
    const word = this.pool[i];
    const truth = Math.random() < 0.5;
    const shown = truth ? word.translations[0] : word.distractors[Math.floor(Math.random() * word.distractors.length)];
    this.current.set({ word, shown, truth });
    this.count.update((n) => n + 1);
  }

  protected answer(value: boolean): void {
    const c = this.current();
    if (!c || this.phase() !== 'playing' || this.flash()) return;
    const ok = c.truth === value;
    if (ok) {
      this.combo.update((n) => n + 1);
      this.bestCombo.update((b) => Math.max(b, this.combo()));
      this.right.update((n) => n + 1);
      this.score.update((s) => s + 10 + Math.min(20, (this.combo() - 1) * 2));
    } else {
      this.combo.set(0);
      this.wrongCount.update((n) => n + 1);
    }
    this.flash.set(ok ? 'ok' : 'bad');
    this.later(
      () => {
        this.flash.set(null);
        if (this.phase() === 'playing') this.nextCard();
      },
      ok ? 180 : 450,
    );
  }

  private end(): void {
    if (this.phase() !== 'playing') return;
    this.finishGame({ score: this.score(), correct: this.right(), wrong: this.wrongCount() });
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.phase() !== 'playing') return;
    if (event.key === 'ArrowLeft') this.answer(false);
    else if (event.key === 'ArrowRight') this.answer(true);
  }
}
