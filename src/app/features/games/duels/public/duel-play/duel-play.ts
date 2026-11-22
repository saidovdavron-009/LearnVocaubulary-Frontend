import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, Subscription, switchMap, timer } from 'rxjs';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../../shared/ui/button/button';
import { ConfirmService } from '../../../../../shared/ui/confirm/confirm.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { DuelPlayer, DuelQuestion, DuelState, GamesService, PairsCard } from '../../../games.service';
import { speak, stopSpeaking } from '../../../shared/speech';

/** Holat so'rash oralig'i (raqib yurishlarini tez ko'rish uchun). */
const POLL_MS = 700;
/** Javobdan keyin to'g'ri/xato ko'rsatib turish vaqti. */
const REVEAL_MS = 650;

interface Reveal {
  question: DuelQuestion;
  picked: number;
  correctIndex: number;
  points: number;
}

/**
 * Duel o'yini. Holat har soniyada serverdan olinadi (raqib progressi, vaqt, natija).
 * Vaqt server soatiga moslab hisoblanadi (serverTime − Date.now() farqi).
 */
@Component({
  selector: 'app-duel-play',
  imports: [Avatar, Button, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-page', '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (duel(); as d) {
      <!-- Hisob paneli -->
      <header class="bg-ink px-4 pt-4 pb-5 text-fg-inverse md:px-12">
        <div class="mx-auto flex max-w-190 items-center gap-3">
          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-input border-2 border-fg-inverse/15 transition-colors hover:bg-fg-inverse/10"
            [attr.aria-label]="d.phase === 'finished' ? 'O‘yinlarga qaytish' : 'Duelni tark etish'"
            (click)="exit()"
          >
            <app-icon name="x" [size]="20" />
          </button>
          <div class="flex flex-1 items-center gap-3">
            <div class="flex min-w-0 flex-1 items-center gap-2.5">
              <app-avatar [name]="d.me.name" [src]="d.me.avatarUrl" [size]="44" />
              <div class="flex min-w-0 flex-col">
                <span class="truncate text-label text-line-strong">Siz</span>
                <span class="font-display text-h3 text-yellow" aria-live="polite">{{ formatNumber(d.me.score) }}</span>
              </div>
            </div>
            <span
              class="flex h-10 min-w-16 items-center justify-center rounded-lg px-2 font-display text-h3"
              [class]="timerValue() <= (d.game === 'pairs' ? 5 : 10) && d.phase === 'playing' ? 'bg-coral-strong' : 'bg-fg-inverse/10'"
              [attr.aria-label]="timerValue() + ' soniya qoldi'"
            >
              {{ d.phase === 'finished' ? 'VS' : timerValue() }}
            </span>
            <div class="flex min-w-0 flex-1 flex-row-reverse items-center gap-2.5 text-right">
              <app-avatar [name]="d.opponent.name" [src]="d.opponent.avatarUrl" [size]="44" />
              <div class="flex min-w-0 flex-col">
                <span class="truncate text-label text-line-strong">{{ d.opponent.name }}</span>
                <span class="font-display text-h3 text-fg-inverse">{{ formatNumber(d.opponent.score) }}</span>
              </div>
            </div>
          </div>
        </div>
        @if (d.game === 'pairs') {
          <!-- Navbat ko'rsatkichi -->
          <div class="mx-auto mt-3 grid max-w-190 grid-cols-2 gap-6 pl-14 text-label">
            <span class="flex items-center gap-1.5" [class]="d.pairs?.myTurn && d.phase === 'playing' ? 'text-yellow' : 'text-line-strong'">
              @if (d.pairs?.myTurn && d.phase === 'playing') {
                <span class="size-2 animate-pulse rounded-full bg-yellow" aria-hidden="true"></span> Sizning navbatingiz
              } @else {
                {{ d.me.score }} juft
              }
            </span>
            <span class="flex items-center justify-end gap-1.5" [class]="!d.pairs?.myTurn && d.phase === 'playing' ? 'text-yellow' : 'text-line-strong'">
              @if (!d.pairs?.myTurn && d.phase === 'playing') {
                Raqib navbati <span class="size-2 animate-pulse rounded-full bg-yellow" aria-hidden="true"></span>
              } @else {
                {{ d.opponent.score }} juft
              }
            </span>
          </div>
        } @else {
        <!-- Progress: har savol — nuqta -->
        <div class="mx-auto mt-3 grid max-w-190 grid-cols-2 gap-6 pl-14">
          @for (p of [d.me, d.opponent]; track p.userId; let first = $first) {
            <div class="flex gap-1" [class.justify-end]="!first" [attr.aria-label]="(first ? 'Sizning' : 'Raqib') + ' progressi: ' + p.answeredCount + ' / ' + d.questionCount">
              @for (i of indexes(); track i) {
                <span class="h-2 flex-1 rounded-full transition-colors" [class]="dotClass(p, i)"></span>
              }
            </div>
          }
        </div>
        }
      </header>

      <main class="flex flex-1 flex-col items-center justify-center px-4 py-8">
        @switch (d.phase) {
          @case ('countdown') {
            <section class="flex flex-col items-center gap-8 text-center">
              <div class="flex items-center gap-6 md:gap-10">
                <div class="flex w-32 flex-col items-center gap-2">
                  <app-avatar [name]="d.me.name" [src]="d.me.avatarUrl" [size]="88" />
                  <span class="max-w-full truncate text-body-strong text-fg">{{ d.me.name }}</span>
                  <span class="text-caption text-fg-muted">{{ d.me.level }}-daraja</span>
                </div>
                <span class="font-display text-h1 text-violet">VS</span>
                <div class="flex w-32 flex-col items-center gap-2">
                  <app-avatar [name]="d.opponent.name" [src]="d.opponent.avatarUrl" [size]="88" />
                  <span class="max-w-full truncate text-body-strong text-fg">{{ d.opponent.name }}</span>
                  <span class="text-caption text-fg-muted">{{ d.opponent.isBot ? 'Bot' : d.opponent.level + '-daraja' }}</span>
                </div>
              </div>
              <p class="text-body-lg text-fg-secondary">Duel boshlanmoqda...</p>
              <p class="pop-in font-display text-[110px] leading-none text-violet" aria-live="assertive">{{ countdown() }}</p>
            </section>
          }
          @case ('playing') {
            @if (d.game === 'pairs' && d.pairs; as board) {
              <section class="flex w-full max-w-160 flex-col items-center gap-5">
                <p
                  class="rounded-full px-4 py-1.5 text-label"
                  [class]="board.holdUntil ? 'bg-coral-soft text-coral-text' : board.myTurn ? 'bg-violet text-fg-inverse' : 'bg-muted text-fg-secondary'"
                  aria-live="polite"
                >
                  @if (board.holdUntil) {
                    Juft emas! Navbat {{ board.myTurn ? 'raqibga' : 'sizga' }} o'tadi
                  } @else if (board.myTurn) {
                    Sizning navbatingiz — 2 ta kartochka oching
                  } @else {
                    {{ d.opponent.name }} kartochka ochmoqda...
                  }
                </p>
                <div class="grid w-full grid-cols-4 gap-2 sm:gap-3" role="grid" aria-label="Kartochkalar">
                  @for (card of board.cards; track card.index) {
                    <button
                      type="button"
                      class="flex aspect-[4/3] min-w-0 items-center justify-center rounded-card border-2 p-1.5 text-center shadow-hard transition-[translate,box-shadow,background-color,border-color,opacity] duration-200"
                      [class]="pairsCardClass(card, board.myTurn && !board.holdUntil)"
                      [disabled]="!board.myTurn || !!board.holdUntil || card.faceUp || card.matched || flipping()"
                      [attr.aria-label]="card.text ?? 'Yopiq kartochka'"
                      (click)="flip(card.index)"
                    >
                      @if (card.text) {
                        <span class="pop-in w-full min-w-0 font-display leading-tight [overflow-wrap:anywhere] hyphens-auto" [class]="cardTextClass(card.text)" lang="uz">{{ breakable(card.text) }}</span>
                      } @else {
                        <app-icon name="logo" [size]="26" class="opacity-60" />
                      }
                    </button>
                  }
                </div>
                <p class="text-caption text-fg-muted">
                  <span class="mr-1 inline-block size-3 rounded-sm bg-mint align-middle"></span> siz topgan
                  <span class="mr-1 ml-4 inline-block size-3 rounded-sm bg-coral align-middle"></span> raqib topgan
                </p>
              </section>
            } @else if (shownQuestion(); as q) {
              <section class="flex w-full max-w-190 flex-col items-center gap-7" aria-live="polite">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-violet-soft py-1.5 pr-3.5 pl-3 text-label text-violet-text">
                  Savol {{ q.index + 1 }} / {{ d.questionCount }}
                </span>
                @if (d.game === 'listen') {
                  <!-- Eshit va tanla: so'z ekranda emas, ovozda; javobdan keyin ko'rsatiladi -->
                  <button
                    type="button"
                    class="flex size-24 items-center justify-center rounded-full bg-mint text-fg-inverse shadow-[0_6px_0_0_var(--color-mint-deep)] transition-transform active:translate-y-1"
                    aria-label="So'zni qayta eshitish"
                    (click)="say(q.text)"
                  >
                    <app-icon name="speaker" [size]="44" />
                  </button>
                  <p class="h-7 text-body-lg text-fg">
                    @if (reveal()) {
                      <b>{{ q.text }}</b>
                    } @else {
                      <span class="text-body text-fg-muted">Qayta eshitish uchun bosing</span>
                    }
                  </p>
                } @else {
                  <div class="flex flex-col items-center gap-2 text-center">
                    <h1 class="font-display text-h1 break-all text-fg md:text-[64px] md:leading-[67px] md:tracking-[-2px]">{{ q.text }}</h1>
                    @if (q.transcription) {
                      <p class="text-body-lg text-fg-muted">{{ q.transcription }}</p>
                    }
                  </div>
                }
                <div class="h-7">
                  @if (reveal(); as r) {
                    <span class="pop-in text-body-strong" [class]="r.points ? 'text-mint-text' : 'text-coral-text'">
                      {{ r.points ? '+' + r.points + ' ball' : "Noto'g'ri" }}
                    </span>
                  }
                </div>
                <div class="grid w-full gap-3.5 sm:grid-cols-2" role="group" aria-label="Javob variantlari">
                  @for (option of q.options; track $index; let i = $index) {
                    @let state = optionState(i);
                    <button
                      type="button"
                      class="flex min-h-19.5 items-center gap-3.5 rounded-card border-2 px-4.5 py-5 text-left shadow-hard transition-[translate,box-shadow,background-color,border-color] duration-150"
                      [class]="
                        state === 'correct'
                          ? 'border-mint bg-mint-soft shadow-mint'
                          : state === 'wrong'
                            ? 'shake border-coral-strong bg-coral-soft shadow-coral-strong'
                            : state === 'dim'
                              ? 'border-line bg-surface opacity-60 shadow-line'
                              : 'border-line bg-surface shadow-line hover:border-violet active:translate-y-0.5 active:shadow-hard-sm'
                      "
                      [disabled]="answering() || !!reveal()"
                      (click)="choose(i)"
                    >
                      <span class="flex size-8.5 shrink-0 items-center justify-center rounded-md bg-muted text-body-strong text-fg-secondary">{{ i + 1 }}</span>
                      <span class="font-display text-h3 text-fg">{{ option }}</span>
                    </button>
                  }
                </div>
              </section>
            } @else {
              <section class="flex max-w-130 flex-col items-center gap-5 text-center" role="status">
                <span class="flex size-20 items-center justify-center rounded-full bg-mint text-fg-inverse" aria-hidden="true">
                  <app-icon name="check" [size]="40" />
                </span>
                <h1 class="font-display text-h2 text-fg">Siz tugatdingiz!</h1>
                <p class="text-body-lg text-fg-secondary">
                  {{ d.opponent.name }} hali o'ynamoqda: {{ d.opponent.answeredCount }} / {{ d.questionCount }}. Natija u tugatishi yoki vaqt tugashi bilan chiqadi.
                </p>
                <span class="size-8 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
              </section>
            }
          }
          @case ('finished') {
            <section class="pop-in flex w-full max-w-150 flex-col items-center gap-6 rounded-3xl border-2 border-line bg-surface p-7 text-center md:p-9">
              <span
                class="flex size-24 items-center justify-center rounded-full text-fg-inverse"
                [class]="d.outcome === 'win' ? 'bg-yellow text-fg shadow-[0_6px_0_0_var(--color-yellow-deep)]' : d.outcome === 'loss' ? 'bg-coral-strong' : 'bg-blue'"
                aria-hidden="true"
              >
                <app-icon [name]="d.outcome === 'win' ? 'trophy' : d.outcome === 'loss' ? 'heart' : 'users'" [size]="48" />
              </span>
              <div class="flex flex-col gap-1">
                <h1 class="font-display text-h1" [class]="d.outcome === 'win' ? 'text-violet' : d.outcome === 'loss' ? 'text-coral-text' : 'text-blue-text'">
                  {{ d.outcome === 'win' ? "G'alaba!" : d.outcome === 'loss' ? "Mag'lubiyat" : 'Durang' }}
                </h1>
                <p class="text-body-lg text-fg-secondary">{{ resultNote() }}</p>
              </div>

              <div class="grid w-full grid-cols-2 gap-3">
                @for (p of [d.me, d.opponent]; track p.userId; let first = $first) {
                  <div class="flex flex-col items-center gap-1.5 rounded-card p-4" [class]="first ? 'bg-violet-soft' : 'bg-muted'">
                    <app-avatar [name]="p.name" [src]="p.avatarUrl" [size]="44" />
                    <span class="max-w-full truncate text-label text-fg-secondary">{{ first ? 'Siz' : p.name }}</span>
                    <span class="font-display text-h2 text-fg">{{ formatNumber(p.score) }}</span>
                    <span class="text-caption text-fg-muted">{{ correctLabel(d, p) }}</span>
                  </div>
                }
              </div>

              <p class="inline-flex items-center gap-1.5 rounded-lg bg-yellow-soft px-3.5 py-2 text-body-strong text-fg">
                <app-icon name="bolt" [size]="18" class="text-yellow-text" />
                {{ d.xpEarned === null ? 'XP hisoblanmoqda...' : '+' + d.xpEarned + ' XP' }}
              </p>

              <details class="w-full text-left">
                <summary class="cursor-pointer text-label text-violet-text">Savollar va to'g'ri javoblar</summary>
                <ul class="mt-3 flex flex-col gap-1.5">
                  @for (r of d.review; track $index) {
                    <li class="flex items-center gap-2 text-body text-fg">
                      <app-icon
                        [name]="r.myAnswerCorrect ? 'check' : 'x'"
                        [size]="16"
                        [class]="r.myAnswerCorrect ? 'text-mint-text' : 'text-coral-text'"
                      />
                      <b>{{ r.text }}</b> — {{ r.correctOption }}
                    </li>
                  }
                </ul>
              </details>

              <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <a appButton routerLink="/games" variant="secondary" size="m" [block]="true" class="min-w-0">O'yinlar</a>
                <a appButton routerLink="/games/duel" [queryParams]="{ mode: d.opponent.isBot ? 'bot' : 'random', game: d.game }" size="m" icon="refresh" [block]="true" class="min-w-0">
                  Yana o'ynash
                </a>
              </div>
            </section>
          }
        }
      </main>
    } @else if (notFound()) {
      <main class="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 class="font-display text-h2 text-fg">Duel topilmadi</h1>
        <p class="text-body-lg text-fg-secondary">U allaqachon tugagan yoki havola noto'g'ri.</p>
        <a appButton routerLink="/games" size="l">O'yinlarga qaytish</a>
      </main>
    } @else {
      <main class="flex flex-1 items-center justify-center">
        <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" role="status" aria-label="Yuklanmoqda"></span>
      </main>
    }
  `,
})
export class DuelPlay implements OnInit {
  private readonly service = inject(GamesService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly shell = inject(AppShellService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly formatNumber = formatNumber;
  protected readonly duel = signal<DuelState | null>(null);
  protected readonly notFound = signal(false);
  protected readonly answering = signal(false);
  protected readonly reveal = signal<Reveal | null>(null);
  protected readonly flipping = signal(false);
  /** Brauzer soati — har 200ms yangilanadi (taymer va sanoq uchun). */
  private readonly now = signal(Date.now());
  private clockOffset = 0;

  protected readonly indexes = computed(() => Array.from({ length: this.duel()?.questionCount ?? 10 }, (_, i) => i));
  /** Javob ko'rsatilayotganda eski savol ekranda qoladi. */
  protected readonly shownQuestion = computed(() => this.reveal()?.question ?? this.duel()?.question ?? null);
  protected readonly secondsLeft = computed(() => {
    const d = this.duel();
    if (!d) return 0;
    return Math.max(0, Math.ceil((new Date(d.endsAt).getTime() - (this.now() + this.clockOffset)) / 1000));
  });
  /** Tepadagi taymer: quiz — duel oxirigacha, pairs — joriy navbat oxirigacha. */
  protected readonly timerValue = computed(() => {
    const d = this.duel();
    if (d?.game !== 'pairs' || !d.pairs) return this.secondsLeft();
    const end = new Date(d.pairs.holdUntil ?? d.pairs.turnEndsAt).getTime();
    return Math.max(0, Math.ceil((end - (this.now() + this.clockOffset)) / 1000));
  });
  protected readonly countdown = computed(() => {
    const d = this.duel();
    if (!d) return 3;
    return Math.max(1, Math.ceil((new Date(d.startsAt).getTime() - (this.now() + this.clockOffset)) / 1000));
  });
  protected readonly resultNote = computed(() => {
    const d = this.duel();
    if (!d) return '';
    if (d.opponent.left) return `${d.opponent.name} duelni tark etdi.`;
    if (d.me.left) return 'Siz duelni tark etdingiz.';
    const diff = Math.abs(d.me.score - d.opponent.score);
    const unit = d.game === 'pairs' ? 'juft' : 'ball';
    if (d.outcome === 'win') return `${d.opponent.name}dan ${formatNumber(diff)} ${unit} ko'p!`;
    if (d.outcome === 'loss') return `${formatNumber(diff)} ${unit} yetmadi. Keyingi safar albatta!`;
    return 'Kuchlar teng keldi!';
  });

  private poll: Subscription | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private resultsRefreshed = false;

  constructor() {
    const tick = setInterval(() => this.now.set(Date.now()), 200);
    // Eshit va tanla: har yangi savolda so'z avtomatik aytiladi.
    let spokenKey = '';
    effect(() => {
      const d = this.duel();
      const q = this.shownQuestion();
      if (d?.game !== 'listen' || d.phase !== 'playing' || !q || this.reveal()) return;
      const key = `${d.id}:${q.index}`;
      if (key === spokenKey) return;
      spokenKey = key;
      untracked(() => setTimeout(() => speak(q.text), 250));
    });
    this.destroyRef.onDestroy(() => {
      stopSpeaking();
      clearInterval(tick);
      this.poll?.unsubscribe();
      if (this.revealTimer) clearTimeout(this.revealTimer);
    });
  }

  ngOnInit(): void {
    if (!this.shell.profile()) this.shell.loadAll();
    this.poll = timer(0, POLL_MS)
      .pipe(switchMap(() => this.service.duel(this.id()).pipe(catchError((err: { status?: number }) => of(err?.status === 404 ? 404 : null)))))
      .subscribe((r) => {
        if (r === 404) {
          if (!this.duel()) this.notFound.set(true);
          this.poll?.unsubscribe();
          return;
        }
        if (r && typeof r === 'object') this.apply(r);
      });
  }

  private apply(state: DuelState): void {
    this.clockOffset = new Date(state.serverTime).getTime() - Date.now();
    this.duel.set(state);
    if (state.phase === 'finished' && state.xpEarned !== null) {
      this.poll?.unsubscribe();
      if (!this.resultsRefreshed) {
        this.resultsRefreshed = true;
        this.shell.refreshStats();
      }
    }
  }

  protected choose(optionIndex: number): void {
    const d = this.duel();
    const q = d?.question;
    if (!d || !q || d.phase !== 'playing' || this.answering() || this.reveal()) return;
    this.answering.set(true);
    this.service.answer(d.id, q.index, optionIndex).subscribe({
      next: (r) => {
        this.answering.set(false);
        if (r.accepted) {
          this.reveal.set({ question: q, picked: optionIndex, correctIndex: r.correctIndex, points: r.points });
          this.revealTimer = setTimeout(() => {
            this.reveal.set(null);
            this.apply(r.state);
          }, REVEAL_MS);
        } else {
          this.apply(r.state);
        }
      },
      error: () => this.answering.set(false),
    });
  }

  protected say(text: string): void {
    speak(text);
  }

  protected correctLabel(d: DuelState, p: DuelPlayer): string {
    return d.game === 'pairs' ? `${p.correctCount} juft topildi` : `${p.correctCount} / ${d.questionCount} to'g'ri`;
  }

  /** Pairs: kartochka ochish (faqat o'z navbatida). */
  protected flip(index: number): void {
    const d = this.duel();
    if (!d?.pairs?.myTurn || d.pairs.holdUntil || this.flipping()) return;
    this.flipping.set(true);
    this.service.flip(d.id, index).subscribe({
      next: (r) => {
        this.flipping.set(false);
        this.apply(r.state);
      },
      error: () => this.flipping.set(false),
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

  protected pairsCardClass(card: PairsCard, canFlip: boolean): string {
    if (card.matched)
      return card.matchedByMe
        ? 'border-mint bg-mint-soft text-mint-text shadow-mint opacity-70'
        : 'border-coral bg-coral-soft text-coral-text shadow-coral opacity-70';
    if (card.faceUp)
      return (card.side === 'en' ? 'border-violet bg-violet-soft text-violet-text' : 'border-blue bg-blue-soft text-blue-text') + ' shadow-line';
    if (card.text) return 'border-line bg-surface text-fg-secondary shadow-line';
    return canFlip
      ? 'border-violet-deep bg-violet text-fg-inverse shadow-violet-deep hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-sm'
      : 'cursor-default border-violet-deep bg-violet/70 text-fg-inverse shadow-violet-deep';
  }

  protected optionState(i: number): 'idle' | 'correct' | 'wrong' | 'dim' {
    const r = this.reveal();
    if (!r) return 'idle';
    if (i === r.correctIndex) return 'correct';
    return i === r.picked ? 'wrong' : 'dim';
  }

  protected dotClass(p: DuelPlayer, i: number): string {
    if (i >= p.answers.length) return 'bg-fg-inverse/15';
    return p.answers[i] ? 'bg-mint' : 'bg-coral-strong';
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!/^[1-4]$/.test(event.key)) return;
    this.choose(Number(event.key) - 1);
  }

  protected async exit(): Promise<void> {
    const d = this.duel();
    if (!d || d.phase === 'finished') {
      void this.router.navigate(['/games']);
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Duelni tark etasizmi?',
      message: "Agar chiqib ketsangiz, raqibingiz g'olib deb topiladi.",
      confirmText: 'Tark etish',
      cancelText: 'Davom etish',
      tone: 'danger',
    });
    if (!ok) return;
    this.poll?.unsubscribe();
    this.service.leave(d.id).subscribe({ error: () => undefined });
    void this.router.navigate(['/games']);
  }
}
