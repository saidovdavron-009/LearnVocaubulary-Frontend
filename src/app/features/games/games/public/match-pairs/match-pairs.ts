import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { GameResultSaved, GamesService, GameWord, shuffle } from '../../../games.service';

const PAIRS = 6;

type Phase = 'loading' | 'error' | 'playing' | 'saving' | 'done';

interface Card {
  id: number;
  wordId: number;
  text: string;
  side: 'en' | 'uz';
  open: boolean;
  matched: boolean;
  wrong: boolean;
}

/**
 * Juftini top: 12 ta yopiq kartochka (6 inglizcha so'z + 6 o'zbekcha tarjima).
 * Ball: har juft 100, tezlik bonusi (60 soniyadan qolgan har soniya +5), har ortiqcha urinish −15.
 */
@Component({
  selector: 'app-match-pairs',
  imports: [Button, Icon, ErrorState, RouterLink],
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
      <div
        class="h-4 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Topilgan juftlar"
        [attr.aria-valuenow]="matchedPairs()"
        aria-valuemin="0"
        [attr.aria-valuemax]="pairs"
      >
        <div class="h-full rounded-full bg-blue transition-[width] duration-300" [style.width.%]="(matchedPairs() / pairs) * 100"></div>
      </div>
      <span class="shrink-0 text-body-strong text-fg-secondary">{{ matchedPairs() }} / {{ pairs }}</span>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-soft py-2.5 pr-3.5 pl-3 text-body-strong text-blue-text">
        <app-icon name="clock" [size]="18" /> {{ elapsedLabel() }}
      </span>
      <span class="hidden shrink-0 items-center gap-1.5 rounded-lg bg-muted py-2.5 pr-3.5 pl-3 text-body-strong text-fg-secondary sm:inline-flex">
        {{ moves() }} urinish
      </span>
    </header>

    <main class="flex flex-1 flex-col items-center justify-center px-4 pb-10">
      @switch (phase()) {
        @case ('loading') {
          <div class="flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            Kartochkalar tayyorlanmoqda...
          </div>
        }
        @case ('error') {
          <div class="w-full max-w-130 rounded-2xl border-2 border-line bg-surface">
            <app-error-state title="O'yinni boshlab bo'lmadi" [message]="error()" (retry)="load()" />
          </div>
        }
        @case ('playing') {
          <section class="flex w-full max-w-190 flex-col items-center gap-6">
            <p class="text-body-lg text-fg-secondary">Inglizcha so'zni o'zbekcha tarjimasi bilan juftlang</p>
            <div class="grid w-full grid-cols-3 gap-3 md:grid-cols-4 md:gap-4" role="grid" aria-label="Kartochkalar">
              @for (card of cards(); track card.id) {
                <button
                  type="button"
                  class="flex aspect-[4/3] items-center justify-center rounded-card border-2 p-2 text-center shadow-hard transition-[translate,box-shadow,background-color,border-color,opacity] duration-200"
                  [class]="
                    card.matched
                      ? 'border-mint bg-mint-soft text-mint-text opacity-60 shadow-mint'
                      : card.wrong
                        ? 'shake border-coral-strong bg-coral-soft text-coral-text shadow-coral-strong'
                        : card.open
                          ? (card.side === 'en' ? 'border-violet bg-violet-soft text-violet-text' : 'border-blue bg-blue-soft text-blue-text') + ' shadow-line'
                          : 'border-violet-deep bg-violet text-fg-inverse shadow-violet-deep hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-sm'
                  "
                  [disabled]="card.matched || card.open"
                  [attr.aria-label]="card.open || card.matched ? card.text : 'Yopiq kartochka'"
                  (click)="flip(card)"
                >
                  @if (card.open || card.matched) {
                    <span class="pop-in w-full min-w-0 font-display leading-tight [overflow-wrap:anywhere] hyphens-auto" [class]="cardTextClass(card.text)" lang="uz">{{ breakable(card.text) }}</span>
                  } @else {
                    <app-icon name="logo" [size]="32" class="opacity-60" />
                  }
                </button>
              }
            </div>
            <p class="text-caption text-fg-muted">
              <span class="mr-3 inline-block size-3 rounded-sm bg-violet-soft align-middle ring-2 ring-violet"></span>inglizcha
              <span class="mr-3 ml-4 inline-block size-3 rounded-sm bg-blue-soft align-middle ring-2 ring-blue"></span>o'zbekcha
            </p>
          </section>
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
              <p class="text-body-lg text-fg-secondary">Barcha juftlar topildi!</p>
              <p class="font-display text-[72px] leading-none text-blue-text">{{ formatNumber(score()) }}</p>
              <p class="text-body text-fg-muted">ball · rekord {{ formatNumber(saved()?.bestScore ?? score()) }}</p>
            </div>
            <div class="grid w-full grid-cols-2 gap-3">
              <div class="rounded-card bg-blue-soft p-3">
                <p class="font-display text-h2 text-blue-text">{{ elapsedLabel() }}</p>
                <p class="text-caption text-blue-text">vaqt</p>
              </div>
              <div class="rounded-card bg-violet-soft p-3">
                <p class="font-display text-h2 text-violet-text">{{ moves() }}</p>
                <p class="text-caption text-violet-text">urinish ({{ mismatches() }} xato)</p>
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
            <div class="flex w-full flex-col gap-1.5 text-left">
              @for (w of words(); track w.wordId) {
                <p class="text-body text-fg"><b>{{ w.text }}</b> — {{ w.translations[0] }}</p>
              }
            </div>
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <a appButton routerLink="/games" variant="secondary" size="m" [block]="true" class="min-w-0">O'yinlar</a>
              <button appButton type="button" size="m" icon="refresh" [block]="true" class="min-w-0" (click)="load()">Yana o'ynash</button>
            </div>
          </section>
        }
      }
    </main>
  `,
})
export class MatchPairs {
  private readonly service = inject(GamesService);
  private readonly shell = inject(AppShellService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pairs = PAIRS;
  protected readonly formatNumber = formatNumber;

  protected readonly phase = signal<Phase>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly words = signal<GameWord[]>([]);
  protected readonly cards = signal<Card[]>([]);
  protected readonly moves = signal(0);
  protected readonly mismatches = signal(0);
  protected readonly elapsedMs = signal(0);
  protected readonly saved = signal<GameResultSaved | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly matchedPairs = computed(() => this.cards().filter((c) => c.matched).length / 2);
  protected readonly elapsedLabel = computed(() => {
    const s = Math.floor(this.elapsedMs() / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  protected readonly score = computed(() => {
    const seconds = this.elapsedMs() / 1000;
    const extraMoves = Math.max(0, this.moves() - PAIRS);
    return Math.max(0, PAIRS * 100 + Math.round(Math.max(0, 60 - seconds) * 5) - extraMoves * 15);
  });

  private startedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
    this.load();
  }

  protected load(): void {
    this.stopTimer();
    this.phase.set('loading');
    this.error.set(null);
    this.service.words(PAIRS + 4).subscribe({
      next: (list) => {
        // Bir xil tarjimali so'zlar bir o'yinga tushmasin — aks holda juft noaniq bo'ladi.
        const seen = new Set<string>();
        const words = list
          .filter((w) => w.translations.length)
          .filter((w) => {
            const key = w.translations[0].toLowerCase();
            if (seen.has(key) || seen.has(w.text.toLowerCase())) return false;
            seen.add(key);
            seen.add(w.text.toLowerCase());
            return true;
          })
          .slice(0, PAIRS);
        if (words.length < PAIRS) {
          this.error.set("O'yin uchun so'zlar yetarli emas.");
          this.phase.set('error');
          return;
        }
        this.words.set(words);
        let id = 0;
        this.cards.set(
          shuffle(
            words.flatMap((w) => [
              { id: id++, wordId: w.wordId, text: w.text, side: 'en' as const, open: false, matched: false, wrong: false },
              { id: id++, wordId: w.wordId, text: w.translations[0], side: 'uz' as const, open: false, matched: false, wrong: false },
            ]),
          ),
        );
        this.moves.set(0);
        this.mismatches.set(0);
        this.elapsedMs.set(0);
        this.saved.set(null);
        this.saveError.set(null);
        this.startedAt = 0;
        this.busy = false;
        this.phase.set('playing');
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.phase.set('error');
      },
    });
  }

  /** "/" dan keyin ko'rinmas bo'linish nuqtasi — "qahramon/personaj" ikki qatorga bo'linadi. */
  protected breakable(text: string): string {
    return text.replace(/\//g, '/​');
  }

  /** Uzun matnli kartochkada shrift kichikroq — kartochkadan chiqib ketmasin. */
  protected cardTextClass(text: string): string {
    if (text.length > 16) return 'text-caption sm:text-label';
    if (text.length > 10) return 'text-label sm:text-body';
    return 'text-label sm:text-body-lg';
  }

  protected flip(card: Card): void {
    if (this.busy || card.open || card.matched || this.phase() !== 'playing') return;
    if (!this.startedAt) {
      this.startedAt = performance.now();
      this.timer = setInterval(() => this.elapsedMs.set(performance.now() - this.startedAt), 250);
    }

    this.update(card.id, { open: true });
    const open = this.cards().filter((c) => c.open && !c.matched);
    if (open.length < 2) return;

    this.moves.update((n) => n + 1);
    const [a, b] = open;
    if (a.wordId === b.wordId && a.side !== b.side) {
      this.update(a.id, { matched: true, open: false });
      this.update(b.id, { matched: true, open: false });
      if (this.cards().every((c) => c.matched)) this.finish();
      return;
    }

    this.mismatches.update((n) => n + 1);
    this.busy = true;
    this.update(a.id, { wrong: true });
    this.update(b.id, { wrong: true });
    setTimeout(() => {
      this.update(a.id, { open: false, wrong: false });
      this.update(b.id, { open: false, wrong: false });
      this.busy = false;
    }, 800);
  }

  private update(id: number, patch: Partial<Card>): void {
    this.cards.update((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  private finish(): void {
    this.stopTimer();
    this.elapsedMs.set(performance.now() - this.startedAt);
    this.phase.set('saving');
    this.service
      .submitResult({
        gameType: 'match_pairs',
        score: this.score(),
        correctCount: PAIRS,
        wrongCount: this.mismatches(),
        durationMs: Math.round(this.elapsedMs()),
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

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
