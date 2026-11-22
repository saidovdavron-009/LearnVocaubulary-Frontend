import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord, shuffle } from '../../../games.service';
import { normalizeAnswer } from '../../../shared/answer';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { clueOf, SoloGame, uniqueWords } from '../../../shared/solo-game';

const LIVES = 3;

interface Drop {
  id: number;
  word: GameWord;
  answer: string;
  /** Chapdan, % da. */
  x: number;
  /** 0 — tepada, 1 — yerda. */
  y: number;
  /** Bir soniyada bosib o'tadigan masofa (0..1). */
  speed: number;
}

/**
 * Tushayotgan so'zlar: tepadan o'zbekcha so'zlar tushadi, yerga yetguncha inglizchasini yozish kerak.
 * 3 ta jon; yerga tushgan har so'z — bitta jon. O'yin borgan sari tezlashadi.
 * Ball: har so'z 10 + qancha baland tutilsa shuncha bonus (20 gacha).
 */
@Component({
  selector: 'app-falling-words',
  imports: [Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" (retry)="load()">
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
            title="Tushayotgan so'zlar"
            text="Tepadan o'zbekcha so'zlar tushib keladi. Ular yerga yetguncha inglizchasini yozing!"
            icon="arrow-right"
            iconClass="bg-blue text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          />
        }
        @case ('playing') {
          <section class="flex w-full max-w-160 flex-1 flex-col gap-3">
            <div class="relative min-h-80 flex-1 overflow-hidden rounded-3xl border-2 border-line bg-surface" [class.shake]="hit()" aria-live="polite">
              @for (d of drops(); track d.id) {
                <div
                  class="absolute max-w-[45%] -translate-x-1/2 rounded-xl px-3 py-1.5 text-center text-body-strong shadow-hard [overflow-wrap:anywhere]"
                  [class]="d.y > 0.75 ? 'bg-coral-soft text-coral-text shadow-coral' : 'bg-violet text-fg-inverse shadow-violet-deep'"
                  [style.left.%]="d.x"
                  [style.top.%]="d.y * 88"
                >
                  {{ clue(d.word) }}
                </div>
              }
              @if (missed(); as m) {
                <p class="pop-in absolute inset-x-0 bottom-3 text-center text-body text-coral-text">
                  {{ clue(m) }} — <b>{{ m.text }}</b>
                </p>
              }
              <div class="absolute inset-x-0 bottom-0 h-1.5 bg-coral/40"></div>
            </div>
            <input
              #answer
              type="text"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              class="h-14 w-full rounded-input border-2 border-line bg-surface px-4 text-center font-display text-h3 text-fg outline-none focus:border-violet"
              [class.border-mint]="caught()"
              placeholder="Inglizchasini yozing..."
              aria-label="Javob"
              [value]="typed()"
              (input)="onInput($any($event.target).value)"
              (keydown.enter)="typed.set('')"
            />
          </section>
        }
        @case ('done') {
          <app-game-result
            title="Jonlar tugadi!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: caughtWords().length, label: 'tutildi', tone: 'mint' },
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
export class FallingWords extends SoloGame {
  protected readonly gameType = 'falling_words' as const;
  protected readonly clue = clueOf;
  protected readonly rules: GameRule[] = [
    { icon: 'keyboard', text: "Inglizchasini yozing — to'g'ri bo'lishi bilan so'z yo'qoladi", tone: 'violet' },
    { icon: 'heart', text: '3 ta jon: yerga tushgan har so\'z bitta jonni oladi', tone: 'coral' },
    { icon: 'bolt', text: "Vaqt o'tgan sari so'zlar tezroq va ko'proq tushadi" },
  ];

  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answer');

  private pool: GameWord[] = [];
  private queue: GameWord[] = [];
  protected readonly drops = signal<Drop[]>([]);
  protected readonly typed = signal('');
  protected readonly lives = signal(LIVES);
  protected readonly score = signal(0);
  protected readonly caughtWords = signal<GameWord[]>([]);
  protected readonly missedWords = signal<GameWord[]>([]);
  protected readonly missed = signal<GameWord | null>(null);
  protected readonly hit = signal(false);
  protected readonly caught = signal(false);

  protected readonly livesArray = computed(() => Array.from({ length: LIVES }, (_, i) => i < this.lives()));
  protected readonly resultWords = computed<ResultWord[]>(() => [
    ...this.caughtWords().map((w) => ({ en: w.text, uz: clueOf(w), ok: true })),
    ...this.missedWords().map((w) => ({ en: w.text, uz: clueOf(w), ok: false })),
  ]);

  private frame = 0;
  private lastTick = 0;
  private nextSpawn = 0;
  private spawned = 0;
  private dropId = 0;

  constructor() {
    super();
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));
    this.load();
  }

  protected load(): void {
    cancelAnimationFrame(this.frame);
    this.fetchWords(60, (list) => {
      this.pool = uniqueWords(list, (w) => /^[a-z][a-z ]{1,13}$/i.test(w.text.trim()));
      return this.pool.length >= 8;
    });
  }

  protected start(): void {
    this.queue = [];
    this.drops.set([]);
    this.typed.set('');
    this.lives.set(LIVES);
    this.score.set(0);
    this.caughtWords.set([]);
    this.missedWords.set([]);
    this.missed.set(null);
    this.spawned = 0;
    this.phase.set('playing');
    this.startClock();
    this.lastTick = performance.now();
    this.nextSpawn = this.lastTick + 400;
    this.frame = requestAnimationFrame((t) => this.tick(t));
    this.later(() => this.answerInput()?.nativeElement.focus(), 50);
  }

  private tick(now: number): void {
    if (this.phase() !== 'playing') return;
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    if (now >= this.nextSpawn) {
      this.spawn();
      // Tushish oralig'i 2.8 s dan 1.2 s gacha qisqaradi.
      this.nextSpawn = now + Math.max(1200, 2800 - this.spawned * 70);
    }

    const landed: Drop[] = [];
    const drops = this.drops()
      .map((d) => ({ ...d, y: d.y + d.speed * dt }))
      .filter((d) => {
        if (d.y >= 1) {
          landed.push(d);
          return false;
        }
        return true;
      });
    this.drops.set(drops);

    for (const d of landed) {
      this.lives.update((n) => n - 1);
      this.missedWords.update((list) => [...list, d.word]);
      this.missed.set(d.word);
      this.hit.set(true);
      this.later(() => this.hit.set(false), 400);
      this.later(() => this.missed() === d.word && this.missed.set(null), 2200);
    }
    if (this.lives() <= 0) {
      this.finishGame({ score: this.score(), correct: this.caughtWords().length, wrong: this.missedWords().length });
      return;
    }
    this.frame = requestAnimationFrame((t) => this.tick(t));
  }

  private spawn(): void {
    if (!this.queue.length) this.queue = shuffle(this.pool);
    const active = new Set(this.drops().map((d) => d.answer));
    let word = this.queue.shift()!;
    if (active.has(normalizeAnswer(word.text)) && this.queue.length) word = this.queue.shift()!;
    // Tushish vaqti 9 s dan 4.5 s gacha qisqaradi.
    const fallSeconds = Math.max(4.5, 9 - this.spawned * 0.15);
    this.spawned++;
    this.drops.update((list) => [
      ...list,
      { id: this.dropId++, word, answer: normalizeAnswer(word.text), x: 15 + Math.random() * 70, y: 0, speed: 1 / fallSeconds },
    ]);
  }

  protected onInput(value: string): void {
    this.typed.set(value);
    const answer = normalizeAnswer(value);
    if (!answer) return;
    // Bir xil so'zdan bir nechta bo'lsa — eng pastdagisi (xavfliroq) olinadi.
    const match = this.drops()
      .filter((d) => d.answer === answer)
      .sort((a, b) => b.y - a.y)[0];
    if (!match) return;
    this.drops.update((list) => list.filter((d) => d.id !== match.id));
    this.caughtWords.update((list) => [...list, match.word]);
    this.score.update((s) => s + 10 + Math.round((1 - match.y) * 20));
    this.typed.set('');
    const input = this.answerInput()?.nativeElement;
    if (input) input.value = '';
    this.caught.set(true);
    this.later(() => this.caught.set(false), 250);
  }
}
