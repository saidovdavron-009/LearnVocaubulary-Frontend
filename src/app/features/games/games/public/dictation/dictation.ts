import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { GameWord } from '../../../games.service';
import { editDistance, normalizeAnswer } from '../../../shared/answer';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { clueOf, SoloGame, uniqueWords } from '../../../shared/solo-game';
import { canSpeak, speak } from '../../../shared/speech';

const ROUNDS = 10;

type Verdict = 'correct' | 'typo' | 'wrong';

/**
 * Eshit va yoz: so'z ovozda aytiladi, foydalanuvchi uni inglizcha yozadi.
 * Ball: to'g'ri — 100, kichik xato (1 harf) — 60, xato — 0.
 */
@Component({
  selector: 'app-dictation',
  imports: [Button, Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? index() / words().length : null" barClass="bg-violet" (retry)="load()">
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
            title="Eshit va yoz"
            text="So'z ovozda aytiladi — uni inglizcha yozing. Quloqni ham, imloni ham mashq qiladi."
            icon="headphones"
            iconClass="bg-violet text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          >
            @if (!canSpeak) {
              <p class="text-label text-coral-text">Brauzeringiz ovozni qo'llab-quvvatlamaydi — boshqa brauzerda oching.</p>
            }
          </app-game-intro>
        }
        @case ('playing') {
          @if (current(); as w) {
            <section class="flex w-full max-w-130 flex-col items-center gap-6">
              <div class="flex items-center gap-4">
                <button
                  type="button"
                  class="flex size-24 items-center justify-center rounded-full bg-violet text-fg-inverse shadow-violet-deep transition-transform active:translate-y-0.5"
                  aria-label="So'zni eshitish"
                  (click)="play()"
                >
                  <app-icon name="speaker" [size]="44" />
                </button>
                <button
                  type="button"
                  class="flex size-14 items-center justify-center rounded-full border-2 border-line bg-surface text-label text-violet-text hover:bg-muted"
                  aria-label="Sekinroq eshitish"
                  (click)="play(true)"
                >
                  0.5x
                </button>
              </div>

              <form class="flex w-full flex-col gap-3" (submit)="$event.preventDefault(); submit()">
                <input
                  #answer
                  type="text"
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                  class="h-15 w-full rounded-input border-2 bg-surface px-4 text-center font-display text-h3 text-fg outline-none focus:border-violet"
                  [class]="verdict() === 'correct' ? 'border-mint' : verdict() === 'typo' ? 'border-yellow' : verdict() === 'wrong' ? 'border-coral-strong' : 'border-line'"
                  placeholder="Eshitgan so'zingizni yozing"
                  [readOnly]="verdict() !== null"
                  [value]="typed()"
                  (input)="typed.set($any($event.target).value)"
                  aria-label="Javob"
                />
                @if (verdict(); as v) {
                  <div
                    class="pop-in rounded-card p-4 text-center"
                    [class]="v === 'correct' ? 'bg-mint-soft text-mint-text' : v === 'typo' ? 'bg-yellow-soft text-yellow-text' : 'bg-coral-soft text-coral-text'"
                  >
                    <p class="text-body-strong">{{ v === 'correct' ? "To'g'ri!" : v === 'typo' ? "Deyarli to'g'ri — kichik xato bor" : "Noto'g'ri" }}</p>
                    <p class="text-body"><b>{{ w.text }}</b> — {{ clue(w) }}</p>
                  </div>
                  <button appButton type="button" size="m" icon="arrow-right" [block]="true" (click)="next()">{{ index() + 1 >= words().length ? 'Natija' : 'Keyingisi' }}</button>
                } @else {
                  <button appButton type="submit" size="m" [block]="true" [disabled]="!typed().trim()">Tekshirish</button>
                }
              </form>
            </section>
          }
        }
        @case ('done') {
          <app-game-result
            title="Diktant tugadi!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: correct() + ' / ' + words().length, label: 'to\\'g\\'ri', tone: 'mint' },
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
export class Dictation extends SoloGame {
  protected readonly gameType = 'dictation' as const;
  protected readonly canSpeak = canSpeak;
  protected readonly clue = clueOf;
  protected readonly rules: GameRule[] = [
    { icon: 'speaker', text: "Karnay tugmasi — qayta eshitish, 0.5x — sekin", tone: 'violet' },
    { icon: 'check', text: "To'g'ri — 100 ball, bitta harf xato — 60 ball" },
    { icon: 'keyboard', text: 'Enter — tekshirish va keyingi so\'z', tone: 'violet' },
  ];

  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answer');

  protected readonly words = signal<GameWord[]>([]);
  protected readonly index = signal(0);
  protected readonly typed = signal('');
  protected readonly verdict = signal<Verdict | null>(null);
  protected readonly verdicts = signal<Verdict[]>([]);
  protected readonly score = signal(0);

  protected readonly current = computed(() => this.words()[this.index()] ?? null);
  protected readonly correct = computed(() => this.verdicts().filter((v) => v !== 'wrong').length);
  protected readonly resultWords = computed<ResultWord[]>(() =>
    this.words().map((w, i) => ({ en: w.text, uz: clueOf(w), ok: this.verdicts()[i] === undefined ? undefined : this.verdicts()[i] !== 'wrong' })),
  );

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.fetchWords(30, (list) => {
      const words = uniqueWords(list, (w) => /^[a-z' -]{2,20}$/i.test(w.text.trim())).slice(0, ROUNDS);
      this.words.set(words);
      return words.length >= 5;
    });
  }

  protected start(): void {
    this.index.set(0);
    this.score.set(0);
    this.verdicts.set([]);
    this.phase.set('playing');
    this.startClock();
    this.round();
  }

  private round(): void {
    this.typed.set('');
    this.verdict.set(null);
    this.later(() => {
      this.play();
      this.answerInput()?.nativeElement.focus();
    }, 300);
  }

  protected play(slow = false): void {
    const w = this.current();
    if (w) speak(w.text, slow);
  }

  protected submit(): void {
    if (this.verdict()) {
      this.next();
      return;
    }
    const w = this.current();
    const answer = normalizeAnswer(this.typed());
    if (!w || !answer) return;
    const target = normalizeAnswer(w.text);
    const distance = editDistance(answer, target);
    const v: Verdict = distance === 0 ? 'correct' : distance === 1 && target.length >= 5 ? 'typo' : 'wrong';
    this.verdict.set(v);
    this.verdicts.update((list) => [...list, v]);
    this.score.update((s) => s + (v === 'correct' ? 100 : v === 'typo' ? 60 : 0));
    this.later(() => this.answerInput()?.nativeElement.focus(), 0);
  }

  protected next(): void {
    if (this.index() + 1 >= this.words().length) {
      this.finishGame({ score: this.score(), correct: this.correct(), wrong: this.words().length - this.correct() });
      return;
    }
    this.index.update((i) => i + 1);
    this.round();
  }
}
