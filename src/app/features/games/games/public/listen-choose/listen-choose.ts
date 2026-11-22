import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord, shuffle } from '../../../games.service';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { SoloGame, uniqueWords } from '../../../shared/solo-game';
import { canSpeak, speak } from '../../../shared/speech';

const ROUNDS = 12;

interface Question {
  word: GameWord;
  options: string[];
  answer: string;
}

/**
 * Eshit va tanla: so'z faqat ovozda aytiladi, to'g'ri o'zbekcha tarjimani tanlash kerak.
 * Ball: to'g'ri — 100 + tezlik bonusi (5 soniyadan qolgan har soniya +10).
 */
@Component({
  selector: 'app-listen-choose',
  imports: [Button, Icon, GameFrame, GameIntro, GameResult, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:keydown)': 'onKey($event)' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? index() / questions().length : null" barClass="bg-mint" (retry)="load()">
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
            title="Eshit va tanla"
            text="Inglizcha so'z faqat ovozda aytiladi — uning o'zbekcha tarjimasini tanlang."
            icon="headphones"
            iconClass="bg-mint text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          >
            @if (!canSpeak) {
              <p class="text-label text-coral-text">Brauzeringiz ovozni qo'llab-quvvatlamaydi — boshqa brauzerda oching.</p>
            }
            <a appButton routerLink="/games/duel" [queryParams]="{ mode: 'random', game: 'listen' }" variant="secondary" size="m" icon="users" [block]="true">1v1 onlayn o'ynash</a>
          </app-game-intro>
        }
        @case ('playing') {
          @if (current(); as q) {
            <section class="flex w-full max-w-160 flex-col items-center gap-7">
              <button
                type="button"
                class="flex size-28 items-center justify-center rounded-full bg-mint text-fg-inverse shadow-[0_6px_0_0_var(--color-mint-deep)] transition-transform active:translate-y-1"
                aria-label="So'zni qayta eshitish"
                (click)="play()"
              >
                <app-icon name="speaker" [size]="52" />
              </button>
              @if (picked()) {
                <p class="pop-in text-body-lg text-fg"><b>{{ q.word.text }}</b> {{ q.word.transcription }}</p>
              } @else {
                <p class="text-body text-fg-muted">Qayta eshitish uchun bosing</p>
              }
              <div class="grid w-full gap-3 sm:grid-cols-2" role="group" aria-label="Javob variantlari">
                @for (option of q.options; track option; let i = $index) {
                  <button
                    type="button"
                    class="flex min-h-16 items-center gap-3 rounded-card border-2 px-4 py-3 text-left shadow-hard transition-[translate,box-shadow,background-color,border-color] duration-150"
                    [class]="optionClass(option, q)"
                    [disabled]="!!picked()"
                    (click)="choose(option)"
                  >
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-body-strong text-fg-secondary">{{ i + 1 }}</span>
                    <span class="min-w-0 text-body-lg font-semibold text-fg [overflow-wrap:anywhere]">{{ option }}</span>
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
export class ListenChoose extends SoloGame {
  protected readonly gameType = 'listen_choose' as const;
  protected readonly canSpeak = canSpeak;
  protected readonly rules: GameRule[] = [
    { icon: 'speaker', text: 'Karnay tugmasi — so\'zni qayta eshitish', tone: 'violet' },
    { icon: 'check', text: "To'g'ri javob — 100 ball + tezlik bonusi" },
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
    this.questions().map((q, i) => ({ en: q.word.text, uz: q.answer, ok: this.results()[i] })),
  );

  private shownAt = 0;

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.fetchWords(30, (list) => {
      const qs = uniqueWords(list, (w) => w.distractors.length >= 3)
        .slice(0, ROUNDS)
        .map((word) => ({ word, answer: word.translations[0], options: shuffle([word.translations[0], ...word.distractors.slice(0, 3)]) }));
      this.questions.set(qs);
      return qs.length >= 5;
    });
  }

  protected start(): void {
    this.index.set(0);
    this.score.set(0);
    this.results.set([]);
    this.phase.set('playing');
    this.startClock();
    this.round();
  }

  private round(): void {
    this.picked.set(null);
    this.later(() => {
      this.play();
      this.shownAt = performance.now();
    }, 300);
  }

  protected play(): void {
    const q = this.current();
    if (q) speak(q.word.text);
  }

  protected choose(option: string): void {
    const q = this.current();
    if (!q || this.picked()) return;
    this.picked.set(option);
    const ok = option === q.answer;
    this.results.update((r) => [...r, ok]);
    if (ok) {
      const seconds = (performance.now() - this.shownAt) / 1000;
      this.score.update((s) => s + 100 + Math.round(Math.max(0, 5 - seconds) * 10));
    }
    this.later(() => this.next(), ok ? 900 : 1800);
  }

  private next(): void {
    if (this.index() + 1 >= this.questions().length) {
      this.finishGame({ score: this.score(), correct: this.correct(), wrong: this.questions().length - this.correct() });
      return;
    }
    this.index.update((i) => i + 1);
    this.round();
  }

  protected optionClass(option: string, q: Question): string {
    const picked = this.picked();
    if (picked && option === q.answer) return 'border-mint bg-mint-soft shadow-mint';
    if (picked === option) return 'border-coral-strong bg-coral-soft shadow-coral-strong';
    if (picked) return 'border-line bg-surface shadow-line opacity-60';
    return 'border-line bg-surface shadow-line hover:border-mint active:translate-y-0.5 active:shadow-hard-sm';
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.phase() !== 'playing' || this.picked()) return;
    const n = Number(event.key);
    const q = this.current();
    if (q && n >= 1 && n <= q.options.length) this.choose(q.options[n - 1]);
  }
}
