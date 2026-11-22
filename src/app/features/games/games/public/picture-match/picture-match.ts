import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { shuffle } from '../../../games.service';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { PICTURE_WORDS, PictureWord } from '../../../shared/pictures';
import { SoloGame } from '../../../shared/solo-game';
import { speak } from '../../../shared/speech';

const ROUNDS = 10;

interface Question {
  word: PictureWord;
  options: string[];
}

/**
 * Rasm va so'z: rasm (emoji) ko'rsatiladi, to'g'ri inglizcha so'zni tanlash kerak.
 * Variantlar iloji boricha bir toifadan (masalan, hammasi meva) — taxmin qilish qiyinroq bo'lsin.
 * Ball: to'g'ri — 100 + tezlik bonusi (4 soniyadan qolgan har soniya +10).
 */
@Component({
  selector: 'app-picture-match',
  imports: [Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:keydown)': 'onKey($event)' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? index() / questions().length : null" barClass="bg-yellow" (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="shrink-0 text-body-strong text-fg-secondary">{{ index() + 1 }} / {{ questions().length }}</span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
            <app-icon name="star" [size]="18" class="text-yellow-text" /> {{ score() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('ready') {
          <app-game-intro
            title="Rasm va so'z"
            text="Rasmga qarang va uning inglizcha nomini toping. Boshlang'ich daraja uchun ajoyib mashq!"
            icon="eye"
            iconClass="bg-yellow text-fg"
            [rules]="rules"
            (start)="start()"
          />
        }
        @case ('playing') {
          @if (current(); as q) {
            <section class="flex w-full max-w-160 flex-col items-center gap-7">
              @for (k of [index()]; track k) {
                <div class="pop-in flex size-44 items-center justify-center rounded-[40px] border-2 border-line bg-surface shadow-hard shadow-line sm:size-52">
                  <span class="text-[96px] leading-none sm:text-[120px]" role="img" aria-label="Rasm">{{ q.word.emoji }}</span>
                </div>
              }
              @if (picked()) {
                <p class="pop-in text-body-lg text-fg"><b>{{ q.word.en }}</b> — {{ q.word.uz }}</p>
              } @else {
                <p class="text-body text-fg-muted">Bu nima?</p>
              }
              <div class="grid w-full grid-cols-2 gap-3" role="group" aria-label="Javob variantlari">
                @for (option of q.options; track option; let i = $index) {
                  <button
                    type="button"
                    class="flex min-h-16 items-center gap-3 rounded-card border-2 px-4 py-3 text-left shadow-hard transition-[translate,box-shadow,background-color,border-color] duration-150"
                    [class]="optionClass(option, q)"
                    [disabled]="!!picked()"
                    (click)="choose(option)"
                  >
                    <span class="hidden size-8 shrink-0 items-center justify-center rounded-md bg-muted text-body-strong text-fg-secondary sm:flex">{{ i + 1 }}</span>
                    <span class="min-w-0 font-display text-h3 text-fg [overflow-wrap:anywhere]">{{ option }}</span>
                  </button>
                }
              </div>
            </section>
          }
        }
        @case ('done') {
          <app-game-result
            title="O'yin tugadi!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: correct() + ' / ' + questions().length, label: 'to\\'g\\'ri', tone: 'mint' },
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
export class PictureMatch extends SoloGame {
  protected readonly gameType = 'picture_match' as const;
  protected readonly rules: GameRule[] = [
    { icon: 'check', text: "To'g'ri javob — 100 ball + tezlik bonusi" },
    { icon: 'speaker', text: "Javobdan keyin so'z ovozda aytiladi", tone: 'violet' },
    { icon: 'keyboard', text: '1–4 tugmalari bilan ham javob bering', tone: 'violet' },
  ];

  protected readonly questions = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly picked = signal<string | null>(null);
  protected readonly results = signal<boolean[]>([]);
  protected readonly score = signal(0);

  protected readonly current = computed(() => this.questions()[this.index()] ?? null);
  protected readonly correct = computed(() => this.results().filter(Boolean).length);
  protected readonly resultWords = computed<ResultWord[]>(() =>
    this.questions().map((q, i) => ({ en: `${q.word.emoji} ${q.word.en}`, uz: q.word.uz, ok: this.results()[i] })),
  );

  private shownAt = 0;

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.reset();
    const words = shuffle(PICTURE_WORDS).slice(0, ROUNDS);
    this.questions.set(
      words.map((word) => {
        const same = shuffle(PICTURE_WORDS.filter((w) => w !== word && w.category === word.category));
        const rest = shuffle(PICTURE_WORDS.filter((w) => w.category !== word.category));
        const others = [...same.slice(0, 2), ...rest].slice(0, 3);
        return { word, options: shuffle([word.en, ...others.map((o) => o.en)]) };
      }),
    );
    this.phase.set('ready');
  }

  protected start(): void {
    this.index.set(0);
    this.score.set(0);
    this.results.set([]);
    this.picked.set(null);
    this.phase.set('playing');
    this.startClock();
    this.shownAt = performance.now();
  }

  protected choose(option: string): void {
    const q = this.current();
    if (!q || this.picked()) return;
    this.picked.set(option);
    const ok = option === q.word.en;
    this.results.update((r) => [...r, ok]);
    if (ok) {
      const seconds = (performance.now() - this.shownAt) / 1000;
      this.score.update((s) => s + 100 + Math.round(Math.max(0, 4 - seconds) * 10));
    }
    speak(q.word.en);
    this.later(() => {
      if (this.index() + 1 >= this.questions().length) {
        this.finishGame({ score: this.score(), correct: this.correct(), wrong: this.questions().length - this.correct() });
        return;
      }
      this.index.update((i) => i + 1);
      this.picked.set(null);
      this.shownAt = performance.now();
    }, ok ? 1000 : 1900);
  }

  protected optionClass(option: string, q: Question): string {
    const picked = this.picked();
    if (picked && option === q.word.en) return 'border-mint bg-mint-soft shadow-mint';
    if (picked === option) return 'border-coral-strong bg-coral-soft shadow-coral-strong';
    if (picked) return 'border-line bg-surface shadow-line opacity-60';
    return 'border-line bg-surface shadow-line hover:border-yellow active:translate-y-0.5 active:shadow-hard-sm';
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.phase() !== 'playing' || this.picked()) return;
    const n = Number(event.key);
    const q = this.current();
    if (q && n >= 1 && n <= q.options.length) this.choose(q.options[n - 1]);
  }
}
