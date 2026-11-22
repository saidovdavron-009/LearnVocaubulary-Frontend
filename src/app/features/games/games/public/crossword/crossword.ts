import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { ConfirmService } from '../../../../../shared/ui/confirm/confirm.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { GameResultSaved, GamesService, GameWord, shuffle } from '../../../games.service';
import { buildLayout, Dir } from './crossword-layout';

/** Krossvorddagi so'zlar soni (joylab bo'lgancha). */
const MAX_WORDS = 8;
const MIN_WORDS = 4;

type Phase = 'loading' | 'error' | 'playing' | 'saving' | 'done';

interface CwWord {
  id: number;
  number: number;
  dir: Dir;
  answer: string;
  clue: string;
  /** Katakchalar indekslari (row * cols + col), boshidan oxirigacha. */
  cells: number[];
  source: GameWord;
}

interface CwCell {
  key: number;
  answer: string;
  number: number | null;
  across: number | null;
  down: number | null;
}

/**
 * Krossvord: o'zbekcha tarjima (savol) bo'yicha inglizcha so'zni katakchalarga yozish.
 * So'z to'liq va to'g'ri yozilsa — yashil bo'lib qulflanadi. "Harf ochish" yordam beradi, lekin ball kamayadi.
 * Ball: har so'z 100, hammasi topilsa tezlik bonusi (4 daqiqadan qolgan har soniya +2), har ochilgan harf −20.
 */
@Component({
  selector: 'app-crossword',
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
        aria-label="Topilgan so'zlar"
        [attr.aria-valuenow]="solved().size"
        aria-valuemin="0"
        [attr.aria-valuemax]="words().length"
      >
        <div
          class="h-full rounded-full bg-mint transition-[width] duration-300"
          [style.width.%]="words().length ? (solved().size / words().length) * 100 : 0"
        ></div>
      </div>
      <span class="shrink-0 text-body-strong text-fg-secondary">{{ solved().size }} / {{ words().length }}</span>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-mint-soft py-2.5 pr-3.5 pl-3 text-body-strong text-mint-text">
        <app-icon name="clock" [size]="18" /> {{ elapsedLabel() }}
      </span>
    </header>

    <main class="flex flex-1 flex-col items-center px-4 pb-10">
      @switch (phase()) {
        @case ('loading') {
          <div class="my-auto flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            Krossvord tuzilmoqda...
          </div>
        }
        @case ('error') {
          <div class="my-auto w-full max-w-130 rounded-2xl border-2 border-line bg-surface">
            <app-error-state title="O'yinni boshlab bo'lmadi" [message]="error()" (retry)="load()" />
          </div>
        }
        @case ('playing') {
          <section class="flex w-full max-w-250 flex-col gap-6 lg:flex-row lg:items-start">
            <div class="flex min-w-0 flex-1 flex-col items-center gap-4">
              <p class="max-w-130 text-center text-body text-fg-secondary">
                O'zbekcha so'zlarning inglizchasini toping va qaysi katakka mos kelishini o'zingiz aniqlang.
                <span class="text-fg-muted">Katakni qayta bossangiz, yozish yo'nalishi almashadi.</span>
              </p>

              <!-- To'r -->
              <div
                class="grid w-full gap-[3px]"
                [style.max-width.px]="cols() * 46"
                [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
                role="grid"
                aria-label="Krossvord"
              >
                @for (cell of cells(); track $index) {
                  @if (cell) {
                    <div class="relative aspect-square">
                      @if (cell.number) {
                        <span class="pointer-events-none absolute top-0.5 left-1 z-10 text-[9px] leading-none font-bold text-fg-muted sm:text-[11px]">{{ cell.number }}</span>
                      }
                      <input
                        type="text"
                        maxlength="2"
                        autocomplete="off"
                        autocapitalize="characters"
                        autocorrect="off"
                        spellcheck="false"
                        class="size-full rounded-md border-2 p-0 text-center font-display text-body-strong uppercase caret-transparent outline-none transition-colors sm:text-h3"
                        [class]="cellClass(cell)"
                        [attr.data-cell]="cell.key"
                        [attr.aria-label]="cellLabel(cell)"
                        [value]="entries()[cell.key]"
                        [readOnly]="locked().has(cell.key)"
                        (mousedown)="onPointer(cell)"
                        (focus)="onFocus(cell)"
                        (input)="onInput(cell, $event)"
                        (keydown)="onKey(cell, $event)"
                      />
                    </div>
                  } @else {
                    <div aria-hidden="true"></div>
                  }
                }
              </div>

              <div class="grid w-full max-w-130 grid-cols-2 gap-3">
                <button appButton type="button" variant="soft" size="m" icon="lightbulb" [block]="true" class="min-w-0" [disabled]="!activeWord() || solved().has(activeWord()!.id)" (click)="hint()">
                  Harf ochish
                </button>
                <button appButton type="button" variant="secondary" size="m" icon="eye" [block]="true" class="min-w-0" (click)="giveUp()">Javoblar</button>
              </div>
              @if (hints()) {
                <p class="text-caption text-fg-muted">{{ hints() }} ta harf ochildi (har biri −20 ball)</p>
              }
            </div>

            <!-- So'zlar ro'yxati: faqat o'zbekcha, joyi va uzunligi ko'rsatilmaydi -->
            <div class="w-full rounded-card border-2 border-line bg-surface p-4 lg:w-90">
              <h2 class="mb-3 text-body-strong text-fg">So'zlar</h2>
              <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                @for (w of clues(); track w.id) {
                  <li
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-body transition-colors"
                    [class]="solved().has(w.id) ? 'bg-mint-soft text-mint-text' : 'bg-muted text-fg'"
                  >
                    @if (solved().has(w.id)) {
                      <app-icon name="check" [size]="16" class="shrink-0" />
                    }
                    <span class="min-w-0 [overflow-wrap:anywhere]" [class.line-through]="solved().has(w.id)">{{ w.clue }}</span>
                  </li>
                }
              </ul>
            </div>
          </section>
        }
        @case ('saving') {
          <div class="my-auto flex flex-col items-center gap-4 text-fg-secondary" role="status">
            <span class="size-10 animate-spin rounded-full border-4 border-violet border-r-transparent" aria-hidden="true"></span>
            Natija saqlanmoqda...
          </div>
        }
        @case ('done') {
          <section class="pop-in my-auto flex w-full max-w-130 flex-col items-center gap-6 rounded-3xl border-2 border-line bg-surface p-8 text-center">
            @if (saved()?.isNewRecord) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-yellow px-4 py-1.5 text-label text-fg">
                <app-icon name="trophy" [size]="16" /> Yangi rekord!
              </span>
            }
            <div class="flex flex-col gap-1">
              <p class="text-body-lg text-fg-secondary">{{ gaveUp() ? 'Krossvord yakunlandi' : 'Krossvord yechildi!' }}</p>
              <p class="font-display text-[72px] leading-none text-mint-text">{{ formatNumber(score()) }}</p>
              <p class="text-body text-fg-muted">ball · rekord {{ formatNumber(saved()?.bestScore ?? score()) }}</p>
            </div>
            <div class="grid w-full grid-cols-2 gap-3">
              <div class="rounded-card bg-mint-soft p-3">
                <p class="font-display text-h2 text-mint-text">{{ solved().size }} / {{ words().length }}</p>
                <p class="text-caption text-mint-text">so'z topildi</p>
              </div>
              <div class="rounded-card bg-blue-soft p-3">
                <p class="font-display text-h2 text-blue-text">{{ elapsedLabel() }}</p>
                <p class="text-caption text-blue-text">vaqt · {{ hints() }} yordam</p>
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
              @for (w of words(); track w.id) {
                <p class="flex items-start gap-2 text-body text-fg">
                  <app-icon [name]="solved().has(w.id) ? 'check' : 'x'" [size]="18" class="mt-0.5 shrink-0" [class]="solved().has(w.id) ? 'text-mint' : 'text-coral-strong'" />
                  <span class="min-w-0 [overflow-wrap:anywhere]"><b>{{ w.source.text }}</b> — {{ w.clue }}</span>
                </p>
              }
            </div>
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <a appButton routerLink="/games" variant="secondary" size="m" [block]="true" class="min-w-0">O'yinlar</a>
              <button appButton type="button" size="m" icon="refresh" [block]="true" class="min-w-0" (click)="load()">Yangi krossvord</button>
            </div>
          </section>
        }
      }
    </main>
  `,
})
export class Crossword {
  private readonly service = inject(GamesService);
  private readonly shell = inject(AppShellService);
  private readonly confirm = inject(ConfirmService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatNumber = formatNumber;

  protected readonly phase = signal<Phase>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly cols = signal(0);
  protected readonly cells = signal<(CwCell | null)[]>([]);
  protected readonly words = signal<CwWord[]>([]);
  protected readonly entries = signal<string[]>([]);
  protected readonly solved = signal<Set<number>>(new Set());
  protected readonly revealed = signal<Set<number>>(new Set());
  protected readonly activeId = signal<number | null>(null);
  protected readonly activeCell = signal<number | null>(null);
  protected readonly wrongId = signal<number | null>(null);
  protected readonly hints = signal(0);
  protected readonly mistakes = signal(0);
  protected readonly gaveUp = signal(false);
  protected readonly elapsedMs = signal(0);
  protected readonly saved = signal<GameResultSaved | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly activeWord = computed(() => this.words().find((w) => w.id === this.activeId()) ?? null);
  /** Ro'yxatdagi tartib aralash — so'zning to'rdagi joyiga ishora bermasin. */
  protected readonly clues = signal<CwWord[]>([]);
  /** Topilgan so'zlar va ochilgan harflar katakchalari — o'zgartirib bo'lmaydi. */
  protected readonly locked = computed(() => {
    const set = new Set(this.revealed());
    for (const w of this.words()) if (this.solved().has(w.id)) w.cells.forEach((k) => set.add(k));
    return set;
  });
  protected readonly elapsedLabel = computed(() => {
    const s = Math.floor(this.elapsedMs() / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  protected readonly score = computed(() => {
    const all = this.words().length > 0 && this.solved().size === this.words().length && !this.gaveUp();
    const bonus = all ? Math.round(Math.max(0, 240 - this.elapsedMs() / 1000) * 2) : 0;
    return Math.max(0, this.solved().size * 100 + bonus - this.hints() * 20);
  });

  private startedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private wrongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopTimer();
      if (this.wrongTimer) clearTimeout(this.wrongTimer);
    });
    this.load();
  }

  protected load(): void {
    this.stopTimer();
    this.phase.set('loading');
    this.error.set(null);
    this.service.words(40).subscribe({
      next: (list) => {
        if (!this.build(list)) {
          this.error.set("Krossvord uchun so'zlar yetarli emas.");
          this.phase.set('error');
          return;
        }
        this.solved.set(new Set());
        this.revealed.set(new Set());
        this.hints.set(0);
        this.mistakes.set(0);
        this.gaveUp.set(false);
        this.saved.set(null);
        this.saveError.set(null);
        this.elapsedMs.set(0);
        this.startedAt = performance.now();
        this.timer = setInterval(() => this.elapsedMs.set(performance.now() - this.startedAt), 500);
        this.phase.set('playing');
        const first = this.words()[0];
        this.activeId.set(first.id);
        this.activeCell.set(first.cells[0]);
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.phase.set('error');
      },
    });
  }

  /** Faqat lotin harflaridan iborat, takrorlanmaydigan so'zlardan krossvord tuzadi. */
  private build(list: GameWord[]): boolean {
    const seen = new Set<string>();
    const pool = list
      .map((w) => ({ w, answer: w.text.trim().toLowerCase() }))
      .filter(({ w, answer }) => /^[a-z]{3,10}$/.test(answer) && w.translations.length)
      .filter(({ answer }) => !seen.has(answer) && !!seen.add(answer));
    if (pool.length < MIN_WORDS) return false;

    const layout = buildLayout(
      pool.map((p) => p.answer),
      MAX_WORDS,
    );
    if (layout.words.length < MIN_WORDS) return false;

    const { rows, cols } = layout;
    const cells: (CwCell | null)[] = Array.from({ length: rows * cols }, () => null);
    const starts = [...layout.words].sort((a, b) => a.row - b.row || a.col - b.col);
    const numbers = new Map<number, number>();
    for (const s of starts) {
      const k = s.row * cols + s.col;
      if (!numbers.has(k)) numbers.set(k, numbers.size + 1);
    }

    const words: CwWord[] = starts.map((p, id) => {
      const source = pool[p.index].w;
      const keys = Array.from(p.answer, (_, i) => (p.dir === 'across' ? p.row * cols + p.col + i : (p.row + i) * cols + p.col));
      keys.forEach((k, i) => {
        const cell = (cells[k] ??= { key: k, answer: p.answer[i], number: null, across: null, down: null });
        cell[p.dir] = id;
      });
      return {
        id,
        number: numbers.get(keys[0])!,
        dir: p.dir,
        answer: p.answer,
        clue: source.translations.slice(0, 2).join(', '),
        cells: keys,
        source,
      };
    });
    for (const [k, n] of numbers) cells[k]!.number = n;

    // Tartib: avval gorizontal, keyin vertikal — raqam bo'yicha.
    words.sort((a, b) => (a.dir === b.dir ? a.number - b.number : a.dir === 'across' ? -1 : 1));
    this.cols.set(cols);
    this.cells.set(cells);
    this.words.set(words);
    this.clues.set(shuffle(words));
    this.entries.set(Array.from({ length: rows * cols }, () => ''));
    return true;
  }

  // ---------- Tanlash ----------

  /** Tanlangan katakchani yana bossangiz — yo'nalish almashadi. */
  protected onPointer(cell: CwCell): void {
    if (this.activeCell() === cell.key && cell.across !== null && cell.down !== null) {
      this.activeId.set(this.activeId() === cell.across ? cell.down : cell.across);
    }
  }

  protected onFocus(cell: CwCell): void {
    this.activeCell.set(cell.key);
    const current = this.activeWord();
    if (current?.cells.includes(cell.key)) return;
    const preferDown = current?.dir === 'down';
    this.activeId.set(preferDown ? (cell.down ?? cell.across) : (cell.across ?? cell.down));
  }

  protected selectWord(w: CwWord): void {
    this.activeId.set(w.id);
    const target = w.cells.find((k) => !this.entries()[k]) ?? w.cells[0];
    this.focus(target);
  }

  protected moveWord(delta: number): void {
    const list = this.words();
    const i = list.findIndex((w) => w.id === this.activeId());
    const next = list[(i + delta + list.length) % list.length];
    this.selectWord(next);
  }

  // ---------- Yozish ----------

  protected onInput(cell: CwCell, event: Event): void {
    const input = event.target as HTMLInputElement;
    const letter = (input.value.toLowerCase().match(/[a-z]/g) ?? []).pop() ?? '';
    if (this.locked().has(cell.key)) {
      input.value = this.entries()[cell.key];
      return;
    }
    input.value = letter;
    this.setEntry(cell.key, letter);
    if (!letter) return;
    this.check(cell);
    if (this.phase() !== 'playing') return;

    const w = this.activeWord();
    if (!w) return;
    const i = w.cells.indexOf(cell.key);
    const next = w.cells.slice(i + 1).find((k) => !this.locked().has(k));
    if (next !== undefined) this.focus(next);
  }

  protected onKey(cell: CwCell, event: KeyboardEvent): void {
    const w = this.activeWord();
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (this.entries()[cell.key] && !this.locked().has(cell.key)) {
          this.setEntry(cell.key, '');
          return;
        }
        if (!w) return;
        const i = w.cells.indexOf(cell.key);
        const prev = w.cells.slice(0, Math.max(0, i)).reverse().find((k) => !this.locked().has(k));
        if (prev !== undefined) {
          this.setEntry(prev, '');
          this.focus(prev);
        }
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        event.preventDefault();
        const cols = this.cols();
        const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
        const delta = steps[event.key];
        const sideways = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        if (sideways && cell.key % cols === (delta < 0 ? 0 : cols - 1)) return;
        const target = this.cells()[cell.key + delta];
        if (!target) return;
        const dirId = sideways ? target.across : target.down;
        if (dirId !== null) this.activeId.set(dirId);
        this.focus(target.key);
        return;
      }
      case 'Enter':
        event.preventDefault();
        this.moveWord(event.shiftKey ? -1 : 1);
        return;
    }
  }

  /** Katakcha kiradigan so'zlar to'liq yozilgan bo'lsa — tekshiradi. */
  private check(cell: CwCell): void {
    for (const id of [cell.across, cell.down]) {
      if (id === null || this.solved().has(id)) continue;
      const w = this.words().find((x) => x.id === id)!;
      const typed = w.cells.map((k) => this.entries()[k]).join('');
      if (typed.length < w.answer.length) continue;
      if (typed === w.answer) {
        this.solved.update((s) => new Set(s).add(id));
      } else {
        this.mistakes.update((n) => n + 1);
        this.flashWrong(id);
      }
    }
    if (this.solved().size === this.words().length) {
      this.finish();
      return;
    }
    // Joriy so'z topildi — keyingi topilmagan so'zga o'tamiz.
    const active = this.activeId();
    if (active !== null && this.solved().has(active)) {
      const list = this.words();
      const i = list.findIndex((w) => w.id === active);
      const next = [...list.slice(i + 1), ...list.slice(0, i)].find((w) => !this.solved().has(w.id));
      if (next) setTimeout(() => this.selectWord(next), 250);
    }
  }

  private flashWrong(id: number): void {
    if (this.wrongTimer) clearTimeout(this.wrongTimer);
    this.wrongId.set(null);
    setTimeout(() => this.wrongId.set(id));
    this.wrongTimer = setTimeout(() => this.wrongId.set(null), 700);
  }

  /** Joriy so'zdagi birinchi bo'sh yoki xato harfni ochadi. */
  protected hint(): void {
    const w = this.activeWord();
    if (!w || this.solved().has(w.id)) return;
    const i = w.cells.findIndex((k, j) => !this.locked().has(k) && this.entries()[k] !== w.answer[j]);
    if (i < 0) return;
    const key = w.cells[i];
    this.setEntry(key, w.answer[i]);
    this.revealed.update((s) => new Set(s).add(key));
    this.hints.update((n) => n + 1);
    this.check(this.cells()[key]!);
    if (this.phase() === 'playing' && !this.solved().has(w.id)) {
      const next = w.cells.slice(i + 1).find((k) => !this.locked().has(k));
      this.focus(next ?? key);
    }
  }

  protected async giveUp(): Promise<void> {
    const ok = await this.confirm.ask({
      title: "Javoblarni ko'rsatish",
      message: "O'yin tugaydi, faqat topgan so'zlaringiz uchun ball va XP beriladi.",
      confirmText: "Ko'rsatish",
      cancelText: 'Davom etish',
    });
    if (!ok || this.phase() !== 'playing') return;
    this.gaveUp.set(true);
    this.finish();
  }

  private finish(): void {
    this.stopTimer();
    this.elapsedMs.set(performance.now() - this.startedAt);
    this.phase.set('saving');
    this.service
      .submitResult({
        gameType: 'crossword',
        score: this.score(),
        correctCount: this.solved().size,
        wrongCount: this.mistakes() + this.hints(),
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

  // ---------- Ko'rinish ----------

  protected cellClass(cell: CwCell): string {
    const inWord = (id: number | null) => id !== null && (id === cell.across || id === cell.down);
    if (this.solved().has(cell.across ?? -1) || this.solved().has(cell.down ?? -1))
      return 'border-mint bg-mint-soft text-mint-text';
    if (inWord(this.wrongId())) return 'shake border-coral-strong bg-coral-soft text-coral-text';
    const revealed = this.revealed().has(cell.key) ? ' text-blue-text' : ' text-fg';
    if (this.activeCell() === cell.key) return 'border-violet bg-surface ring-4 ring-violet/25' + revealed;
    if (inWord(this.activeId())) return 'border-violet/50 bg-violet-soft' + revealed;
    return 'border-line-strong bg-surface' + revealed;
  }

  protected cellLabel(cell: CwCell): string {
    const ids = [cell.across, cell.down].filter((x): x is number => x !== null);
    const names = ids.map((id) => {
      const w = this.words().find((x) => x.id === id)!;
      return w.dir === 'across' ? 'gorizontal' : 'vertikal';
    });
    return `${names.join(', ')}, harf ${this.entries()[cell.key] || "bo'sh"}`;
  }

  private setEntry(key: number, letter: string): void {
    this.entries.update((list) => {
      const next = [...list];
      next[key] = letter;
      return next;
    });
  }

  private focus(key: number): void {
    this.activeCell.set(key);
    this.host.nativeElement.querySelector<HTMLInputElement>(`[data-cell="${key}"]`)?.focus();
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
