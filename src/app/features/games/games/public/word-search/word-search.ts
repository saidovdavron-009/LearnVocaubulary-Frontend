import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord, shuffle } from '../../../games.service';
import { isPlainWord } from '../../../shared/answer';
import { GameFrame } from '../../../shared/game-frame';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { clueOf, SoloGame, uniqueWords } from '../../../shared/solo-game';

const SIZE = 10;
const WORDS = 7;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
/** Yo'nalishlar: o'ngga, pastga, qiya pastga-o'ngga, qiya yuqoriga-o'ngga. */
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
];

interface Hidden {
  word: GameWord;
  answer: string;
  cells: number[];
  found: boolean;
}

/**
 * So'z qidirish: harflar to'ri ichidan o'zbekcha ro'yxatdagi so'zlarning inglizchasini topib belgilash.
 * Belgilash: birinchi harfdan oxirgisigacha suring yoki ikkalasini ketma-ket bosing.
 * Ball: har so'z 100, hammasi topilsa tezlik bonusi (3 daqiqadan qolgan har soniya +2).
 */
@Component({
  selector: 'app-word-search',
  imports: [Icon, GameFrame, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? foundCount() / hidden().length : null" barClass="bg-blue" (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="shrink-0 text-body-strong text-fg-secondary">{{ foundCount() }} / {{ hidden().length }}</span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-soft py-2.5 pr-3.5 pl-3 text-body-strong text-blue-text">
            <app-icon name="clock" [size]="18" /> {{ elapsedLabel() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('playing') {
          <section class="flex w-full max-w-250 flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
            <div class="flex min-w-0 flex-1 flex-col items-center gap-3">
              <p class="text-center text-body text-fg-secondary">Birinchi harfdan oxirgisigacha suring yoki ikkalasini ketma-ket bosing</p>
              <div
                class="grid w-full max-w-130 touch-none gap-1 select-none"
                [style.grid-template-columns]="'repeat(' + size + ', minmax(0, 1fr))'"
                role="grid"
                aria-label="Harflar to'ri"
                (pointerdown)="onDown($event)"
                (pointermove)="onMove($event)"
                (pointerup)="onUp()"
                (pointercancel)="onUp()"
              >
                @for (letter of letters(); track $index) {
                  <div
                    class="flex aspect-square items-center justify-center rounded-md font-display text-body-strong uppercase transition-colors sm:text-h3"
                    [class]="cellClass($index)"
                    [attr.data-i]="$index"
                  >
                    {{ letter }}
                  </div>
                }
              </div>
            </div>

            <div class="w-full rounded-card border-2 border-line bg-surface p-4 lg:w-80">
              <h2 class="mb-3 text-body-strong text-fg">Topish kerak bo'lgan so'zlar</h2>
              <ul class="grid grid-cols-2 gap-2 lg:grid-cols-1">
                @for (h of listOrder(); track h.answer) {
                  <li class="flex min-w-0 flex-col rounded-lg px-3 py-2 text-body" [class]="h.found ? 'bg-mint-soft text-mint-text' : 'bg-muted text-fg'">
                    <span class="[overflow-wrap:anywhere]" [class.line-through]="h.found">{{ clue(h.word) }}</span>
                    @if (h.found) {
                      <b class="uppercase">{{ h.answer }}</b>
                    }
                  </li>
                }
              </ul>
            </div>
          </section>
        }
        @case ('done') {
          <app-game-result
            title="Barcha so'zlar topildi!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: foundCount(), label: 'so\\'z', tone: 'mint' },
              { value: elapsedLabel(), label: 'vaqt', tone: 'blue' },
              { value: misses(), label: 'xato', tone: 'coral' }
            ]"
            [words]="resultWords()"
            (replay)="load()"
          />
        }
      }
    </app-game-frame>
  `,
})
export class WordSearch extends SoloGame {
  protected readonly gameType = 'word_search' as const;
  protected readonly size = SIZE;
  protected readonly clue = clueOf;

  protected readonly letters = signal<string[]>([]);
  protected readonly hidden = signal<Hidden[]>([]);
  protected readonly listOrder = signal<Hidden[]>([]);
  protected readonly start = signal<number | null>(null);
  protected readonly end = signal<number | null>(null);
  protected readonly misses = signal(0);
  protected readonly flashWrong = signal<number[]>([]);

  protected readonly foundCount = computed(() => this.hidden().filter((h) => h.found).length);
  protected readonly foundCells = computed(() => new Set(this.hidden().flatMap((h) => (h.found ? h.cells : []))));
  protected readonly selection = computed(() => this.line(this.start(), this.end()));
  protected readonly score = computed(() => {
    const all = this.hidden().length > 0 && this.foundCount() === this.hidden().length;
    const bonus = all ? Math.round(Math.max(0, 180 - this.elapsedMs() / 1000) * 2) : 0;
    return Math.max(0, this.foundCount() * 100 + bonus - this.misses() * 10);
  });
  protected readonly resultWords = computed<ResultWord[]>(() => this.hidden().map((h) => ({ en: h.word.text, uz: clueOf(h.word), ok: h.found })));

  private dragging = false;
  private moved = false;

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.fetchWords(40, (list) => this.build(list), 'playing');
  }

  private build(list: GameWord[]): boolean {
    const pool = uniqueWords(list, (w) => isPlainWord(w.text, 3, SIZE - 2));
    // Uzunlari avval joylanadi — sig'masa keyingisi olinadi.
    const sorted = [...pool].sort((a, b) => b.text.length - a.text.length);
    for (let attempt = 0; attempt < 20; attempt++) {
      const grid: (string | null)[] = Array.from({ length: SIZE * SIZE }, () => null);
      const hidden: Hidden[] = [];
      for (const word of sorted) {
        if (hidden.length >= WORDS) break;
        const answer = word.text.trim().toLowerCase();
        const cells = this.place(grid, answer);
        if (cells) hidden.push({ word, answer, cells, found: false });
      }
      if (hidden.length >= Math.min(WORDS, 5)) {
        this.letters.set(grid.map((c) => c ?? ALPHABET[Math.floor(Math.random() * ALPHABET.length)]));
        this.hidden.set(hidden);
        this.listOrder.set(shuffle(hidden));
        this.start.set(null);
        this.end.set(null);
        this.misses.set(0);
        return true;
      }
    }
    return false;
  }

  /** So'zni tasodifiy joy va yo'nalishga qo'yadi (boshqa so'z bilan bir xil harfda kesishishi mumkin). */
  private place(grid: (string | null)[], answer: string): number[] | null {
    const options: number[][] = [];
    for (const [dr, dc] of DIRS) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const endR = r + dr * (answer.length - 1);
          const endC = c + dc * (answer.length - 1);
          if (endR < 0 || endR >= SIZE || endC >= SIZE) continue;
          const cells = Array.from(answer, (_, i) => (r + dr * i) * SIZE + c + dc * i);
          if (cells.every((k, i) => grid[k] === null || grid[k] === answer[i])) options.push(cells);
        }
      }
    }
    if (!options.length) return null;
    const cells = options[Math.floor(Math.random() * options.length)];
    cells.forEach((k, i) => (grid[k] = answer[i]));
    return cells;
  }

  /** Ikki katak orasidagi to'g'ri chiziq (gorizontal, vertikal yoki qiya); chiziq bo'lmasa — faqat boshi. */
  private line(a: number | null, b: number | null): number[] {
    if (a === null) return [];
    if (b === null || a === b) return [a];
    const [r1, c1, r2, c2] = [Math.floor(a / SIZE), a % SIZE, Math.floor(b / SIZE), b % SIZE];
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [a];
    return Array.from({ length: len + 1 }, (_, i) => (r1 + dr * i) * SIZE + c1 + dc * i);
  }

  private cellAt(event: PointerEvent): number | null {
    const el = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-i]');
    return el ? Number(el.dataset['i']) : null;
  }

  protected onDown(event: PointerEvent): void {
    const i = this.cellAt(event);
    if (i === null) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    // Ikkinchi bosish: birinchi harf allaqachon tanlangan bo'lsa — shu katak oxiri bo'ladi.
    if (this.start() !== null && !this.dragging && this.end() === null && i !== this.start()) {
      this.end.set(i);
      this.commit();
      return;
    }
    this.start.set(i);
    this.end.set(null);
    this.dragging = true;
    this.moved = false;
  }

  protected onMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const i = this.cellAt(event);
    if (i === null || i === this.start()) return;
    this.moved = true;
    this.end.set(i);
  }

  protected onUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved && this.end() !== null) this.commit();
    // Siljitilmagan bo'lsa — boshi tanlangan holda qoladi, ikkinchi bosishni kutamiz.
  }

  private commit(): void {
    const cells = this.selection();
    this.start.set(null);
    this.end.set(null);
    if (cells.length < 2) return;
    const text = cells.map((k) => this.letters()[k]).join('');
    const reversed = [...text].reverse().join('');
    const match = this.hidden().find(
      (h) => !h.found && (h.answer === text || h.answer === reversed) && h.cells.length === cells.length && h.cells.every((k) => cells.includes(k)),
    );
    if (match) {
      this.hidden.update((list) => list.map((h) => (h === match ? { ...h, found: true } : h)));
      this.listOrder.update((list) => list.map((h) => (h.answer === match.answer ? { ...h, found: true } : h)));
      if (this.foundCount() === this.hidden().length) {
        this.stopClock();
        this.later(() => this.finishGame({ score: this.score(), correct: this.foundCount(), wrong: this.misses() }), 500);
      }
      return;
    }
    this.misses.update((n) => n + 1);
    this.flashWrong.set(cells);
    this.later(() => this.flashWrong.set([]), 450);
  }

  protected cellClass(i: number): string {
    if (this.selection().includes(i)) return 'bg-violet text-fg-inverse scale-105';
    if (this.flashWrong().includes(i)) return 'bg-coral-soft text-coral-text';
    if (this.foundCells().has(i)) return 'bg-mint text-fg-inverse';
    return 'bg-surface text-fg border border-line';
  }
}
