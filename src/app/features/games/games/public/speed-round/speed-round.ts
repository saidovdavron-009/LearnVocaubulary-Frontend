import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { GameResultSaved, GamesService, GameWord, shuffle } from '../../../games.service';

const ROUND_MS = 60_000;
const WRONG_PENALTY_MS = 2_000;
const BASE_POINTS = 10;

type Phase = 'loading' | 'error' | 'ready' | 'countdown' | 'playing' | 'saving' | 'done';

interface Question {
  word: GameWord;
  options: string[];
  correct: string;
}

/** Tezkor raund: 60 soniyada iloji boricha ko'p to'g'ri tarjima. Xato — 2 soniya jarima, ketma-ketlik — kombo bonus. */
@Component({
  selector: 'app-speed-round',
  imports: [Button, Icon, ErrorState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-page', '(document:keydown)': 'onKeydown($event)' },
  template: `
    <header class="flex items-center gap-3 px-4 py-4 md:gap-5 md:px-12 md:py-6">
      <a
        routerLink="/games"
        class="flex size-12 shrink-0 items-center justify-center rounded-input border-2 border-line bg-surface text-fg transition-colors hover:bg-muted"
        aria-label="O'yinlarga qaytish"
      >
        <app-icon name="x" [size]="22" />
      </a>
      <div
        class="h-4 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Qolgan vaqt"
        [attr.aria-valuenow]="secondsLeft()"
        aria-valuemin="0"
        aria-valuemax="60"
      >
        <div
          class="h-full rounded-full transition-[width] duration-100"
          [class]="remainingMs() < 10_000 ? 'bg-coral-strong' : 'bg-yellow'"
          [style.width.%]="(remainingMs() / roundMs) * 100"
        ></div>
      </div>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
        <app-icon name="clock" [size]="18" class="text-yellow-text" /> {{ secondsLeft() }}
      </span>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-soft py-2.5 pr-3.5 pl-3 text-body-strong text-violet-text">
        <app-icon name="star" [size]="18" /> {{ formatNumber(score()) }}
      </span>
    </header>

    <main class="flex flex-1 flex-col items-center justify-center px-4 pb-10">
      @switch (phase()) {
        @case ('loading') {
          <div class="flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            So'zlar tayyorlanmoqda...
          </div>
        }
        @case ('error') {
          <div class="w-full max-w-130 rounded-2xl border-2 border-line bg-surface">
            <app-error-state title="O'yinni boshlab bo'lmadi" [message]="error()" (retry)="load()" />
          </div>
        }
        @case ('ready') {
          <section class="flex w-full max-w-130 flex-col items-center gap-6 rounded-3xl border-2 border-line bg-surface p-8 text-center">
            <span class="flex size-20 items-center justify-center rounded-full bg-yellow text-fg shadow-[0_6px_0_0_var(--color-yellow-deep)]">
              <app-icon name="clock" [size]="40" />
            </span>
            <div class="flex flex-col gap-2">
              <h1 class="font-display text-h1 text-fg">Tezkor raund</h1>
              <p class="text-body-lg text-fg-secondary">60 soniya ichida iloji boricha ko'p so'zning o'zbekcha tarjimasini toping.</p>
            </div>
            <ul class="flex w-full flex-col gap-2 text-left text-body text-fg-secondary">
              <li class="flex gap-2"><app-icon name="check" [size]="20" class="text-mint" /> To'g'ri javob — 10 ball + kombo bonusi</li>
              <li class="flex gap-2"><app-icon name="x" [size]="20" class="text-coral-strong" /> Xato javob — 2 soniya jarima, kombo nolga tushadi</li>
              <li class="flex gap-2"><app-icon name="keyboard" [size]="20" class="text-violet-text" /> Klaviaturada 1–4 tugmalari bilan ham javob bering</li>
            </ul>
            <button appButton type="button" size="l" variant="yellow" icon="play" [block]="true" (click)="start()">Boshlash</button>
          </section>
        }
        @case ('countdown') {
          <p class="pop-in font-display text-[120px] leading-none text-violet" aria-live="assertive">{{ countdown() }}</p>
        }
        @case ('playing') {
          @if (current(); as q) {
            <section class="flex w-full max-w-190 flex-col items-center gap-7" aria-live="polite">
              <div class="flex h-9 items-center gap-2">
                @if (combo() >= 2) {
                  <span class="pop-in inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3.5 py-1.5 text-label text-coral-text">
                    <app-icon name="flame" [size]="16" /> {{ combo() }}x kombo!
                  </span>
                }
                @if (flash(); as f) {
                  <span class="pop-in text-body-strong" [class]="f.correct ? 'text-mint-text' : 'text-coral-text'">
                    {{ f.correct ? '+' + f.points : '−2 soniya' }}
                  </span>
                }
              </div>
              <div class="flex flex-col items-center gap-2 text-center">
                <h1 class="font-display text-h1 break-all text-fg md:text-[64px] md:leading-[67px] md:tracking-[-2px]">{{ q.word.text }}</h1>
                @if (q.word.transcription) {
                  <p class="text-body-lg text-fg-muted">{{ q.word.transcription }}</p>
                }
              </div>
              <div class="grid w-full gap-3.5 sm:grid-cols-2" role="group" aria-label="Javob variantlari">
                @for (option of q.options; track option; let i = $index) {
                  @let state = optionState(option);
                  <button
                    type="button"
                    class="flex min-h-19.5 items-center gap-3.5 rounded-card border-2 px-4.5 py-5 text-left shadow-hard transition-[translate,box-shadow,background-color,border-color] duration-150"
                    [class]="
                      state === 'correct'
                        ? 'border-mint bg-mint-soft shadow-mint'
                        : state === 'wrong'
                          ? 'border-coral-strong bg-coral-soft shadow-coral-strong'
                          : 'border-line bg-surface shadow-line hover:border-violet active:translate-y-0.5 active:shadow-hard-sm'
                    "
                    [disabled]="locked()"
                    (click)="choose(option)"
                  >
                    <span class="flex size-8.5 shrink-0 items-center justify-center rounded-md bg-muted text-body-strong text-fg-secondary">{{ i + 1 }}</span>
                    <span class="font-display text-h3 text-fg">{{ option }}</span>
                  </button>
                }
              </div>
            </section>
          }
        }
        @case ('saving') {
          <div class="flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            Natija saqlanmoqda...
          </div>
        }
        @case ('done') {
          <section class="pop-in flex w-full max-w-130 flex-col items-center gap-6 rounded-3xl border-2 border-line bg-surface p-8 text-center">
            @if (saved()?.isNewRecord) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-yellow px-4 py-1.5 text-label text-fg">
                <app-icon name="trophy" [size]="16" /> Yangi rekord!
              </span>
            }
            <div class="flex flex-col gap-1">
              <p class="text-body-lg text-fg-secondary">Vaqt tugadi!</p>
              <p class="font-display text-[72px] leading-none text-violet">{{ formatNumber(score()) }}</p>
              <p class="text-body text-fg-muted">ball · rekord {{ formatNumber(saved()?.bestScore ?? score()) }}</p>
            </div>
            <div class="grid w-full grid-cols-3 gap-3">
              <div class="rounded-card bg-mint-soft p-3">
                <p class="font-display text-h2 text-mint-text">{{ correct() }}</p>
                <p class="text-caption text-mint-text">to'g'ri</p>
              </div>
              <div class="rounded-card bg-coral-soft p-3">
                <p class="font-display text-h2 text-coral-text">{{ wrong() }}</p>
                <p class="text-caption text-coral-text">xato</p>
              </div>
              <div class="rounded-card bg-violet-soft p-3">
                <p class="font-display text-h2 text-violet-text">{{ bestCombo() }}x</p>
                <p class="text-caption text-violet-text">eng uzun kombo</p>
              </div>
            </div>
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
            @if (mistakes().length) {
              <div class="flex w-full flex-col gap-1.5 text-left">
                <p class="text-label text-fg-secondary">Xato qilingan so'zlar:</p>
                @for (m of mistakes(); track m.wordId) {
                  <p class="text-body text-fg"><b>{{ m.text }}</b> — {{ m.translations[0] }}</p>
                }
              </div>
            }
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <a appButton routerLink="/games" variant="secondary" size="m" [block]="true" class="min-w-0">O'yinlar</a>
              <button appButton type="button" size="m" variant="yellow" icon="refresh" [block]="true" class="min-w-0" (click)="load(true)">Yana o'ynash</button>
            </div>
          </section>
        }
      }
    </main>
  `,
})
export class SpeedRound {
  private readonly service = inject(GamesService);
  private readonly shell = inject(AppShellService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly roundMs = ROUND_MS;
  protected readonly formatNumber = formatNumber;

  protected readonly phase = signal<Phase>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly countdown = signal(3);
  protected readonly remainingMs = signal(ROUND_MS);
  protected readonly score = signal(0);
  protected readonly correct = signal(0);
  protected readonly wrong = signal(0);
  protected readonly combo = signal(0);
  protected readonly bestCombo = signal(0);
  protected readonly current = signal<Question | null>(null);
  protected readonly picked = signal<string | null>(null);
  protected readonly locked = signal(false);
  protected readonly flash = signal<{ correct: boolean; points: number } | null>(null);
  protected readonly mistakes = signal<GameWord[]>([]);
  protected readonly saved = signal<GameResultSaved | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly secondsLeft = computed(() => Math.ceil(this.remainingMs() / 1000));

  private words: GameWord[] = [];
  private cursor = 0;
  private endsAt = 0;
  private timers: ReturnType<typeof setInterval>[] = [];

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimers());
    this.load();
  }

  protected load(autostart = false): void {
    this.clearTimers();
    this.phase.set('loading');
    this.error.set(null);
    this.service.words(60).subscribe({
      next: (words) => {
        this.words = words.filter((w) => w.translations.length && w.distractors.length >= 3);
        if (this.words.length < 4) {
          this.error.set("O'yin uchun so'zlar yetarli emas.");
          this.phase.set('error');
          return;
        }
        if (autostart) this.start();
        else this.phase.set('ready');
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.phase.set('error');
      },
    });
  }

  protected start(): void {
    this.score.set(0);
    this.correct.set(0);
    this.wrong.set(0);
    this.combo.set(0);
    this.bestCombo.set(0);
    this.mistakes.set([]);
    this.saved.set(null);
    this.saveError.set(null);
    this.remainingMs.set(ROUND_MS);
    this.cursor = 0;
    this.words = shuffle(this.words);

    this.countdown.set(3);
    this.phase.set('countdown');
    const t = setInterval(() => {
      if (this.countdown() > 1) {
        this.countdown.update((n) => n - 1);
        return;
      }
      clearInterval(t);
      this.begin();
    }, 700);
    this.timers.push(t);
  }

  private begin(): void {
    this.phase.set('playing');
    this.endsAt = performance.now() + ROUND_MS;
    this.next();
    const t = setInterval(() => {
      const left = Math.max(0, this.endsAt - performance.now());
      this.remainingMs.set(left);
      if (left <= 0) this.finish();
    }, 100);
    this.timers.push(t);
  }

  private next(): void {
    if (this.cursor >= this.words.length) {
      this.words = shuffle(this.words);
      this.cursor = 0;
    }
    const word = this.words[this.cursor++];
    this.current.set({ word, correct: word.translations[0], options: shuffle([word.translations[0], ...word.distractors.slice(0, 3)]) });
    this.picked.set(null);
    this.locked.set(false);
  }

  protected optionState(option: string): 'idle' | 'correct' | 'wrong' {
    const q = this.current();
    const picked = this.picked();
    if (!q || picked === null) return 'idle';
    if (option === q.correct) return 'correct';
    return option === picked ? 'wrong' : 'idle';
  }

  protected choose(option: string): void {
    const q = this.current();
    if (!q || this.locked() || this.phase() !== 'playing') return;
    this.locked.set(true);
    this.picked.set(option);

    if (option === q.correct) {
      const combo = this.combo() + 1;
      const points = BASE_POINTS + Math.min(10, (combo - 1) * 2);
      this.combo.set(combo);
      this.bestCombo.update((b) => Math.max(b, combo));
      this.score.update((s) => s + points);
      this.correct.update((n) => n + 1);
      this.flash.set({ correct: true, points });
    } else {
      this.combo.set(0);
      this.wrong.update((n) => n + 1);
      this.endsAt -= WRONG_PENALTY_MS;
      this.flash.set({ correct: false, points: 0 });
      if (!this.mistakes().some((m) => m.wordId === q.word.wordId)) this.mistakes.update((m) => [...m, q.word]);
    }

    setTimeout(() => {
      if (this.phase() === 'playing') this.next();
    }, option === q.correct ? 250 : 650);
  }

  private finish(): void {
    if (this.phase() !== 'playing') return;
    this.clearTimers();
    this.remainingMs.set(0);
    this.phase.set('saving');
    this.service
      .submitResult({
        gameType: 'speed_round',
        score: this.score(),
        correctCount: this.correct(),
        wrongCount: this.wrong(),
        durationMs: ROUND_MS,
      })
      .subscribe({
        next: (r) => {
          this.saved.set(r);
          this.phase.set('done');
          this.shell.refreshStats();
        },
        error: (err: unknown) => {
          this.saveError.set(problemMessage(err));
          this.phase.set('done');
        },
      });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.phase() !== 'playing' || !/^[1-4]$/.test(event.key)) return;
    const option = this.current()?.options[Number(event.key) - 1];
    if (option) this.choose(option);
  }

  private clearTimers(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }
}
