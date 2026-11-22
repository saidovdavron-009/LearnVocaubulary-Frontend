import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord, shuffle } from '../../../games.service';
import { isPlainWord } from '../../../shared/answer';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { clueOf, SoloGame, uniqueWords } from '../../../shared/solo-game';

const ROUNDS = 10;

interface Tile {
  id: number;
  letter: string;
  used: boolean;
}

/**
 * Harflarni tartibla: aralashtirilgan harflardan inglizcha so'zni tuzish, tarjima — maslahat.
 * Ball: har so'z 100 + tezlik bonusi (10 soniyadan qolgan har soniya +5), "Ko'rsatish" — 0 ball.
 */
@Component({
  selector: 'app-scramble',
  imports: [Button, Icon, GameFrame, GameIntro, GameResult, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:keydown)': 'onKey($event)' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? index() / words().length : null" barClass="bg-coral-strong" (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="shrink-0 text-body-strong text-fg-secondary">{{ index() + 1 }} / {{ words().length }}</span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
            <app-icon name="star" [size]="18" class="text-yellow-text" /> {{ score() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('ready') {
          <app-game-intro
            title="Harflarni tartibla"
            text="Aralashib ketgan harflardan inglizcha so'zni tuzing. O'zbekcha tarjimasi maslahat sifatida beriladi."
            icon="refresh"
            iconClass="bg-coral-strong text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          >
            <a appButton routerLink="/games/duel" [queryParams]="{ mode: 'random', game: 'scramble' }" variant="secondary" size="m" icon="users" [block]="true">1v1 onlayn o'ynash</a>
          </app-game-intro>
        }
        @case ('playing') {
          @if (current(); as w) {
            <section class="flex w-full max-w-160 flex-col items-center gap-7">
              <div class="flex flex-col items-center gap-1 text-center">
                <p class="text-label text-fg-muted">Tarjimasi</p>
                <h1 class="font-display text-h2 text-fg [overflow-wrap:anywhere] sm:text-h1">{{ clue(w) }}</h1>
              </div>

              <!-- Javob katakchalari -->
              <div class="flex flex-wrap justify-center gap-1.5 sm:gap-2" [class.shake]="wrong()" aria-live="polite">
                @for (slot of slots(); track $index) {
                  <button
                    type="button"
                    class="flex size-10 items-center justify-center rounded-lg border-2 font-display text-h3 uppercase transition-colors sm:size-13"
                    [class]="
                      status() === 'correct'
                        ? 'border-mint bg-mint-soft text-mint-text'
                        : status() === 'shown'
                          ? 'border-blue bg-blue-soft text-blue-text'
                          : wrong()
                            ? 'border-coral-strong bg-coral-soft text-coral-text'
                            : slot
                              ? 'border-violet bg-violet-soft text-fg'
                              : 'border-dashed border-line-strong bg-surface'
                    "
                    [disabled]="!slot || status() !== 'playing'"
                    [attr.aria-label]="slot ? slot.letter + ' harfini qaytarish' : 'Bo\\'sh katak'"
                    (click)="unpick($index)"
                  >
                    {{ slot?.letter }}
                  </button>
                }
              </div>

              <!-- Harflar -->
              <div class="flex flex-wrap justify-center gap-2 sm:gap-3">
                @for (tile of tiles(); track tile.id) {
                  <button
                    type="button"
                    class="flex size-12 items-center justify-center rounded-card border-2 font-display text-h3 uppercase shadow-hard transition-[translate,box-shadow,opacity] duration-150 sm:size-14"
                    [class]="tile.used ? 'border-line bg-muted text-transparent shadow-line opacity-40' : 'border-violet-deep bg-violet text-fg-inverse shadow-violet-deep hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-sm'"
                    [disabled]="tile.used || status() !== 'playing'"
                    (click)="pick(tile)"
                  >
                    {{ tile.letter }}
                  </button>
                }
              </div>

              @if (status() === 'shown') {
                <p class="pop-in text-body-lg text-blue-text">Javob: <b class="uppercase">{{ w.text }}</b></p>
              }

              <div class="grid w-full max-w-100 grid-cols-2 gap-3">
                <button appButton type="button" variant="secondary" size="m" icon="x" [block]="true" class="min-w-0" [disabled]="status() !== 'playing' || !picked().length" (click)="clear()">Tozalash</button>
                <button appButton type="button" variant="soft" size="m" icon="eye" [block]="true" class="min-w-0" [disabled]="status() !== 'playing'" (click)="reveal()">Ko'rsatish</button>
              </div>
              <p class="hidden text-caption text-fg-muted sm:block">Klaviaturadan ham yozishingiz mumkin, Backspace — oxirgi harfni o'chiradi</p>
            </section>
          }
        }
        @case ('done') {
          <app-game-result
            title="Barcha so'zlar tugadi!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: solved() + ' / ' + words().length, label: 'topildi', tone: 'mint' },
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
export class Scramble extends SoloGame {
  protected readonly gameType = 'scramble' as const;
  protected readonly rules: GameRule[] = [
    { icon: 'check', text: "To'g'ri so'z — 100 ball + tezlik bonusi" },
    { icon: 'eye', text: "\"Ko'rsatish\" — javobni ko'rasiz, lekin ball berilmaydi", tone: 'coral' },
    { icon: 'keyboard', text: 'Harflarni bosing yoki klaviaturadan yozing', tone: 'violet' },
  ];

  protected readonly words = signal<GameWord[]>([]);
  protected readonly index = signal(0);
  protected readonly tiles = signal<Tile[]>([]);
  protected readonly picked = signal<Tile[]>([]);
  protected readonly status = signal<'playing' | 'correct' | 'shown'>('playing');
  protected readonly wrong = signal(false);
  protected readonly score = signal(0);
  protected readonly results = signal<boolean[]>([]);

  protected readonly current = computed(() => this.words()[this.index()] ?? null);
  protected readonly slots = computed(() => {
    const w = this.current();
    if (!w) return [];
    return Array.from({ length: w.text.length }, (_, i) => this.picked()[i] ?? null);
  });
  protected readonly solved = computed(() => this.results().filter(Boolean).length);
  protected readonly resultWords = computed<ResultWord[]>(() =>
    this.words().map((w, i) => ({ en: w.text, uz: clueOf(w), ok: this.results()[i] })),
  );

  protected readonly clue = clueOf;
  private roundStart = 0;

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.fetchWords(40, (list) => {
      const words = uniqueWords(list, (w) => isPlainWord(w.text, 3, 9)).slice(0, ROUNDS);
      this.words.set(words);
      return words.length >= 5;
    });
  }

  protected start(): void {
    this.index.set(0);
    this.score.set(0);
    this.results.set([]);
    this.phase.set('playing');
    this.startClock();
    this.setupRound();
  }

  private setupRound(): void {
    const w = this.current();
    if (!w) return;
    const letters = w.text.toLowerCase().split('');
    let mixed = shuffle(letters);
    // Aralashgan holati javobning o'zi bo'lib qolmasin.
    for (let i = 0; i < 5 && mixed.join('') === letters.join(''); i++) mixed = shuffle(letters);
    this.tiles.set(mixed.map((letter, id) => ({ id, letter, used: false })));
    this.picked.set([]);
    this.status.set('playing');
    this.roundStart = performance.now();
  }

  protected pick(tile: Tile): void {
    if (tile.used || this.status() !== 'playing') return;
    this.tiles.update((list) => list.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
    this.picked.update((list) => [...list, tile]);
    if (this.picked().length === this.current()!.text.length) this.check();
  }

  protected unpick(i: number): void {
    if (this.status() !== 'playing') return;
    const tile = this.picked()[i];
    if (!tile) return;
    this.picked.update((list) => list.filter((_, j) => j !== i));
    this.tiles.update((list) => list.map((t) => (t.id === tile.id ? { ...t, used: false } : t)));
  }

  protected clear(): void {
    this.picked.set([]);
    this.tiles.update((list) => list.map((t) => ({ ...t, used: false })));
  }

  private check(): void {
    const w = this.current()!;
    const typed = this.picked().map((t) => t.letter).join('');
    if (typed === w.text.toLowerCase()) {
      const seconds = (performance.now() - this.roundStart) / 1000;
      this.score.update((s) => s + 100 + Math.round(Math.max(0, 10 - seconds) * 5));
      this.status.set('correct');
      this.next(true, 700);
      return;
    }
    this.wrong.set(true);
    this.later(() => {
      this.wrong.set(false);
      this.clear();
    }, 600);
  }

  protected reveal(): void {
    if (this.status() !== 'playing') return;
    const w = this.current()!;
    const tiles = [...this.tiles()];
    const picked = w.text.toLowerCase().split('').map((letter) => {
      const t = tiles.find((x) => x.letter === letter && !x.used)!;
      t.used = true;
      return t;
    });
    this.tiles.set(tiles.map((t) => ({ ...t, used: true })));
    this.picked.set(picked);
    this.status.set('shown');
    this.next(false, 1600);
  }

  private next(ok: boolean, delay: number): void {
    this.results.update((r) => [...r, ok]);
    this.later(() => {
      if (this.index() + 1 >= this.words().length) {
        this.index.update((i) => i + 1);
        const solved = this.solved();
        this.finishGame({ score: this.score(), correct: solved, wrong: this.words().length - solved });
        return;
      }
      this.index.update((i) => i + 1);
      this.setupRound();
    }, delay);
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.phase() !== 'playing' || this.status() !== 'playing' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.picked().length) this.unpick(this.picked().length - 1);
      return;
    }
    const key = event.key.toLowerCase();
    if (!/^[a-z]$/.test(key)) return;
    const tile = this.tiles().find((t) => !t.used && t.letter === key);
    if (tile) this.pick(tile);
  }
}
