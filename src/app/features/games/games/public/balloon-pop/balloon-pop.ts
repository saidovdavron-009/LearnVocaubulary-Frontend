import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord, shuffle } from '../../../games.service';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { clueOf, SoloGame, uniqueWords } from '../../../shared/solo-game';

const ROUNDS = 15;
const LIVES = 3;
const COLORS = ['bg-coral', 'bg-violet', 'bg-mint', 'bg-blue', 'bg-yellow'];

interface Balloon {
  id: number;
  text: string;
  correct: boolean;
  /** Chapdan, %. */
  x: number;
  /** Ko'tarilish davomiyligi, soniya. */
  duration: number;
  delay: number;
  color: string;
  popped: 'ok' | 'bad' | null;
}

/**
 * Shar otish: o'zbekcha so'z ko'rsatiladi, uchib ketayotgan sharlar orasidan inglizchasini bosish kerak.
 * Noto'g'ri shar yoki qochib ketgan to'g'ri shar — bitta jon. Ball: 100 + qanchalik tez bo'lsa shuncha bonus.
 */
@Component({
  selector: 'app-balloon-pop',
  imports: [Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    @keyframes rise {
      from {
        top: 100%;
      }
      to {
        top: -30%;
      }
    }
    .balloon {
      animation-name: rise;
      animation-timing-function: linear;
      animation-fill-mode: both;
    }
    .balloon.popped {
      animation-play-state: paused;
    }
    @media (prefers-reduced-motion: reduce) {
      .balloon {
        animation-duration: 1ms !important;
        animation-delay: 0s !important;
        top: 20%;
        animation-name: none;
      }
    }
  `,
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? round() / rounds().length : null" barClass="bg-coral" (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-coral-soft px-3 py-2.5 text-coral-text" [attr.aria-label]="lives() + ' ta jon qoldi'">
            @for (l of livesArray(); track $index) {
              <app-icon name="heart" [size]="18" [class.opacity-25]="!l" />
            }
          </span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
            <app-icon name="star" [size]="18" class="text-yellow-text" /> {{ score() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('ready') {
          <app-game-intro
            title="Shar otish"
            text="O'zbekcha so'z ko'rsatiladi. Uchib ketayotgan sharlar orasidan uning inglizchasini toping va bosing!"
            icon="target"
            iconClass="bg-coral text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          />
        }
        @case ('playing') {
          <section class="flex w-full max-w-160 flex-1 flex-col gap-3">
            <div class="rounded-card border-2 border-violet bg-violet-soft px-4 py-3 text-center" aria-live="polite">
              <p class="text-label text-violet-text">Inglizchasini toping</p>
              <p class="font-display text-h2 text-fg [overflow-wrap:anywhere]">{{ prompt() }}</p>
            </div>
            <div class="relative min-h-90 flex-1 overflow-hidden rounded-3xl border-2 border-line bg-linear-to-b from-blue-soft to-surface">
              @for (b of balloons(); track b.id) {
                <button
                  type="button"
                  class="balloon absolute flex w-[28%] max-w-36 -translate-x-1/2 flex-col items-center"
                  [class.popped]="!!b.popped"
                  [style.left.%]="b.x"
                  [style.animation-duration.s]="b.duration"
                  [style.animation-delay.s]="b.delay"
                  [disabled]="!!b.popped"
                  (animationend)="escaped(b)"
                  (click)="pop(b)"
                >
                  <span
                    class="flex aspect-[4/5] w-full items-center justify-center rounded-[50%] px-1.5 text-center text-body-strong text-fg-inverse shadow-[inset_-8px_-10px_0_rgba(0,0,0,0.12)] transition-[transform,opacity] duration-200 [overflow-wrap:anywhere]"
                    [class]="b.popped === 'ok' ? 'scale-125 bg-mint opacity-0' : b.popped === 'bad' ? 'scale-125 bg-coral-strong opacity-0' : b.color"
                  >
                    {{ b.text }}
                  </span>
                  <span class="h-8 w-px bg-line-strong" aria-hidden="true"></span>
                </button>
              }
              @if (feedback(); as f) {
                <p class="pop-in absolute inset-x-0 bottom-3 text-center text-body-strong" [class]="f.ok ? 'text-mint-text' : 'text-coral-text'">{{ f.text }}</p>
              }
            </div>
          </section>
        }
        @case ('done') {
          <app-game-result
            [title]="lives() > 0 ? 'Barcha sharlar otildi!' : 'Jonlar tugadi!'"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: correct(), label: 'to\\'g\\'ri', tone: 'mint' },
              { value: elapsedLabel(), label: 'vaqt', tone: 'blue' }
            ]"
            [words]="resultWords()"
            (replay)="load()"
          />
        }
      }
    </app-game-frame>
  `,
})
export class BalloonPop extends SoloGame {
  protected readonly gameType = 'balloon_pop' as const;
  protected readonly rules: GameRule[] = [
    { icon: 'target', text: "To'g'ri sharni bosing — 100 ball + tezlik bonusi" },
    { icon: 'heart', text: "Noto'g'ri shar yoki uchib ketgan to'g'ri shar — bitta jon", tone: 'coral' },
    { icon: 'bolt', text: 'Sharlar borgan sari tezroq uchadi', tone: 'violet' },
  ];

  protected readonly rounds = signal<GameWord[]>([]);
  private allWords: GameWord[] = [];
  protected readonly round = signal(0);
  protected readonly balloons = signal<Balloon[]>([]);
  protected readonly lives = signal(LIVES);
  protected readonly score = signal(0);
  protected readonly results = signal<boolean[]>([]);
  protected readonly feedback = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly current = computed(() => this.rounds()[this.round()] ?? null);
  protected readonly prompt = computed(() => {
    const w = this.current();
    return w ? clueOf(w) : '';
  });
  protected readonly correct = computed(() => this.results().filter(Boolean).length);
  protected readonly livesArray = computed(() => Array.from({ length: LIVES }, (_, i) => i < this.lives()));
  protected readonly resultWords = computed<ResultWord[]>(() =>
    this.rounds()
      .slice(0, this.results().length)
      .map((w, i) => ({ en: w.text, uz: clueOf(w), ok: this.results()[i] })),
  );

  private balloonId = 0;
  private roundStart = 0;
  private resolved = false;

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.fetchWords(40, (list) => {
      this.allWords = uniqueWords(list, (w) => w.text.trim().length <= 16);
      this.rounds.set(this.allWords.slice(0, ROUNDS));
      return this.allWords.length >= 8;
    });
  }

  protected start(): void {
    this.round.set(0);
    this.lives.set(LIVES);
    this.score.set(0);
    this.results.set([]);
    this.phase.set('playing');
    this.startClock();
    this.setupRound();
  }

  private setupRound(): void {
    const w = this.current();
    if (!w) return;
    this.resolved = false;
    this.feedback.set(null);
    const others = shuffle(this.allWords.filter((x) => x !== w)).slice(0, 3);
    const texts = shuffle([{ text: w.text, correct: true }, ...others.map((o) => ({ text: o.text, correct: false }))]);
    // Har raundda biroz tezroq: 7 s dan 4 s gacha.
    const base = Math.max(4, 7 - this.round() * 0.2);
    const lanes = shuffle([14, 38, 62, 86]);
    this.balloons.set(
      texts.map((t, i) => ({
        id: this.balloonId++,
        text: t.text,
        correct: t.correct,
        x: lanes[i],
        duration: base + Math.random() * 1.5,
        delay: Math.random() * 0.9,
        color: COLORS[(this.balloonId + i) % COLORS.length],
        popped: null,
      })),
    );
    this.roundStart = performance.now();
  }

  protected pop(b: Balloon): void {
    if (this.resolved || b.popped) return;
    this.balloons.update((list) => list.map((x) => (x.id === b.id ? { ...x, popped: b.correct ? 'ok' : 'bad' } : x)));
    if (b.correct) {
      const seconds = (performance.now() - this.roundStart) / 1000;
      this.score.update((s) => s + 100 + Math.round(Math.max(0, 6 - seconds) * 10));
      this.resolve(true, "To'g'ri!");
    } else {
      this.loseLife(`${b.text} emas`);
    }
  }

  /** To'g'ri shar tepaga chiqib ketdi. */
  protected escaped(b: Balloon): void {
    if (!b.correct || b.popped || this.resolved) return;
    this.resolve(false, `Uchib ketdi: ${b.text}`);
    this.lives.update((n) => n - 1);
    this.afterRound();
  }

  private loseLife(text: string): void {
    this.lives.update((n) => n - 1);
    this.feedback.set({ ok: false, text });
    if (this.lives() <= 0) {
      this.resolve(false, text);
      this.afterRound();
    }
  }

  private resolve(ok: boolean, text: string): void {
    if (this.resolved) return;
    this.resolved = true;
    this.results.update((r) => [...r, ok]);
    this.feedback.set({ ok, text });
    if (ok) this.afterRound();
  }

  private afterRound(): void {
    this.later(() => {
      if (this.lives() <= 0 || this.round() + 1 >= this.rounds().length) {
        this.finishGame({ score: this.score(), correct: this.correct(), wrong: this.results().length - this.correct() });
        return;
      }
      this.round.update((i) => i + 1);
      this.setupRound();
    }, 700);
  }
}
