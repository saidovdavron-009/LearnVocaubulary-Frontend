import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { problemMessage } from '../../../../../core/api/problem-details';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { DictionaryWord } from '../../../games.service';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { SoloGame } from '../../../shared/solo-game';

const TURN_MS = 20_000;

interface Link {
  text: string;
  translation: string;
  by: 'me' | 'bot';
}

/**
 * So'z zanjiri (botga qarshi): oldingi so'zning oxirgi harfi bilan boshlanadigan yangi so'z aytiladi.
 * apple → egg → green... So'z lug'atda bo'lishi va takrorlanmasligi kerak, har navbatga 20 soniya.
 * Ball: har so'z 10 + uzunligi × 2, maslahat −15, botni yengsangiz +100.
 */
@Component({
  selector: 'app-word-chain',
  imports: [Button, Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" loadingText="Lug'at yuklanmoqda..." (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg py-2.5 pr-3.5 pl-3 text-body-strong" [class]="turnLeft() <= 5 && myTurn() ? 'bg-coral-soft text-coral-text' : 'bg-blue-soft text-blue-text'">
            <app-icon name="clock" [size]="18" /> {{ myTurn() ? turnLeft() : '…' }}
          </span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
            <app-icon name="star" [size]="18" class="text-yellow-text" /> {{ score() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('ready') {
          <app-game-intro
            title="So'z zanjiri"
            text="Bot bilan navbatma-navbat so'z ayting: har bir so'z oldingi so'zning oxirgi harfi bilan boshlanadi. apple → egg → green..."
            icon="link"
            iconClass="bg-violet text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          />
        }
        @case ('playing') {
          <section class="flex w-full max-w-130 flex-1 flex-col gap-4">
            <!-- Zanjir -->
            <div #log class="flex max-h-[50vh] min-h-60 flex-1 flex-col gap-2 overflow-y-auto rounded-3xl border-2 border-line bg-surface p-4" aria-live="polite">
              @for (link of chain(); track $index) {
                <div class="pop-in flex max-w-[85%] flex-col rounded-2xl px-4 py-2" [class]="link.by === 'me' ? 'self-end bg-violet text-fg-inverse' : 'self-start bg-muted text-fg'">
                  <span class="font-display text-h3">
                    <span [class]="link.by === 'me' ? 'text-yellow' : 'text-violet-text'">{{ link.text[0] }}</span>{{ link.text.slice(1, -1) }}<span class="underline decoration-2 underline-offset-4">{{ link.text.length > 1 ? link.text.slice(-1) : '' }}</span>
                  </span>
                  <span class="text-label opacity-80">{{ link.translation }}</span>
                </div>
              }
              @if (!myTurn()) {
                <div class="flex items-center gap-1 self-start rounded-2xl bg-muted px-4 py-3" aria-label="Bot o'ylayapti">
                  <span class="size-2 animate-bounce rounded-full bg-fg-muted"></span>
                  <span class="size-2 animate-bounce rounded-full bg-fg-muted [animation-delay:150ms]"></span>
                  <span class="size-2 animate-bounce rounded-full bg-fg-muted [animation-delay:300ms]"></span>
                </div>
              }
            </div>

            <p class="text-center text-body text-fg-secondary">
              Sizning so'zingiz <b class="font-display text-h3 text-violet-text uppercase">{{ letter() }}</b> harfi bilan boshlansin
            </p>
            @if (hintWord(); as h) {
              <p class="pop-in text-center text-label text-blue-text">Maslahat: {{ h.text.slice(0, 2) }}… — {{ h.translation }}</p>
            }
            <form class="flex gap-2" (submit)="$event.preventDefault(); submit()">
              <input
                #answer
                type="text"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                class="h-14 min-w-0 flex-1 rounded-input border-2 bg-surface px-4 font-display text-h3 text-fg outline-none focus:border-violet"
                [class]="message() ? 'border-coral-strong' : 'border-line'"
                [placeholder]="letter().toUpperCase() + '...'"
                [disabled]="!myTurn()"
                [value]="typed()"
                (input)="typed.set($any($event.target).value); message.set(null)"
                aria-label="So'zingiz"
              />
              <button appButton type="submit" size="m" icon="send" [disabled]="!myTurn() || !typed().trim()" aria-label="Yuborish"></button>
            </form>
            @if (message()) {
              <p class="text-center text-label text-coral-text" role="alert">{{ message() }}</p>
            }
            <div class="grid grid-cols-2 gap-3">
              <button appButton type="button" variant="soft" size="m" icon="lightbulb" [block]="true" class="min-w-0" [disabled]="!myTurn() || !!hintWord()" (click)="hint()">Maslahat</button>
              <button appButton type="button" variant="secondary" size="m" icon="flag" [block]="true" class="min-w-0" (click)="giveUp()">Taslim bo'lish</button>
            </div>
          </section>
        }
        @case ('done') {
          <app-game-result
            [title]="won() ? 'Siz botni yengdingiz! 🎉' : endReason()"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: myWords(), label: 'sizning so\\'zlar', tone: 'violet' },
              { value: chain().length, label: 'zanjir uzunligi', tone: 'mint' },
              { value: elapsedLabel(), label: 'vaqt', tone: 'blue' }
            ]"
            [words]="resultWords()"
            (replay)="start()"
          />
        }
      }
    </app-game-frame>
  `,
})
export class WordChain extends SoloGame {
  protected readonly gameType = 'word_chain' as const;
  protected readonly rules: GameRule[] = [
    { icon: 'link', text: "So'z oldingi so'zning oxirgi harfi bilan boshlanadi", tone: 'violet' },
    { icon: 'clock', text: "Har navbatga 20 soniya, so'zlar takrorlanmaydi", tone: 'coral' },
    { icon: 'book', text: "Faqat lug'atdagi inglizcha so'zlar (bitta so'z) qabul qilinadi", tone: 'violet' },
    { icon: 'trophy', text: "Har so'z — 10 ball + uzunligi uchun bonus, botni yengsangiz +100" },
  ];

  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answer');
  private readonly logBox = viewChild<ElementRef<HTMLElement>>('log');

  private dict = new Map<string, DictionaryWord>();
  private botPool: DictionaryWord[] = [];
  /** Harf → shu harf bilan boshlanadigan (daraja ichidagi) so'zlar soni. */
  private starts = new Map<string, number>();

  protected readonly chain = signal<Link[]>([]);
  protected readonly myTurn = signal(false);
  protected readonly typed = signal('');
  protected readonly message = signal<string | null>(null);
  protected readonly hintWord = signal<DictionaryWord | null>(null);
  protected readonly score = signal(0);
  protected readonly hints = signal(0);
  protected readonly invalid = signal(0);
  protected readonly won = signal(false);
  protected readonly endReason = signal('');
  private readonly turnEndsAt = signal(0);
  private turnId = 0;

  protected readonly letter = computed(() => this.chain().at(-1)?.text.slice(-1) ?? '');
  protected readonly myWords = computed(() => this.chain().filter((l) => l.by === 'me').length);
  protected readonly turnLeft = computed(() => {
    this.elapsedMs(); // har chorak soniyada qayta hisoblash uchun
    return Math.max(0, Math.ceil((this.turnEndsAt() - performance.now()) / 1000));
  });
  protected readonly resultWords = computed<ResultWord[]>(() =>
    this.chain().map((l) => ({ en: (l.by === 'me' ? '🙋 ' : '🤖 ') + l.text, uz: l.translation })),
  );

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.reset();
    this.service.dictionary().subscribe({
      next: (list) => {
        this.dict = new Map(list.map((w) => [w.text, w]));
        this.botPool = list.filter((w) => w.inLevel && w.text.length >= 3);
        this.starts = new Map();
        for (const w of this.botPool) this.starts.set(w.text[0], (this.starts.get(w.text[0]) ?? 0) + 1);
        if (this.botPool.length < 30) {
          this.fail("So'z zanjiri uchun lug'atda so'zlar yetarli emas.");
          return;
        }
        this.phase.set('ready');
      },
      error: (err: unknown) => this.fail(problemMessage(err)),
    });
  }

  protected start(): void {
    this.reset();
    this.chain.set([]);
    this.score.set(0);
    this.hints.set(0);
    this.invalid.set(0);
    this.won.set(false);
    this.phase.set('playing');
    this.startClock();
    this.botMove(true);
  }

  /** Oxirgi harfi bilan boshlanadigan so'zlar yetarli bo'lgan so'zlar — o'yin qotib qolmasin. */
  private friendly(w: DictionaryWord): boolean {
    return (this.starts.get(w.text.slice(-1)) ?? 0) >= 5;
  }

  private botMove(first = false): void {
    this.myTurn.set(false);
    this.later(() => {
      const used = new Set(this.chain().map((l) => l.text));
      const letter = this.letter();
      const options = this.botPool.filter((w) => !used.has(w.text) && (first || w.text[0] === letter));
      const good = options.filter((w) => this.friendly(w));
      // Zanjir uzaygan sari bot ham "charchaydi" — g'alaba qilish imkoni bo'lsin.
      const tired = !first && Math.random() < Math.min(0.5, Math.max(0, this.myWords() - 5) * 0.08);
      const pickFrom = good.length ? good : options;
      if (!pickFrom.length || tired) {
        this.won.set(true);
        this.score.update((s) => s + 100);
        this.finish();
        return;
      }
      const w = pickFrom[Math.floor(Math.random() * pickFrom.length)];
      this.chain.update((c) => [...c, { text: w.text, translation: w.translation, by: 'bot' }]);
      this.startMyTurn();
    }, first ? 300 : 900 + Math.random() * 900);
  }

  private startMyTurn(): void {
    this.myTurn.set(true);
    this.typed.set('');
    this.message.set(null);
    this.hintWord.set(null);
    this.turnEndsAt.set(performance.now() + TURN_MS);
    const id = ++this.turnId;
    this.later(() => {
      if (this.turnId === id && this.myTurn() && this.phase() === 'playing') {
        this.endReason.set('Vaqt tugadi — bot yutdi');
        this.finish();
      }
    }, TURN_MS);
    this.later(() => {
      this.answerInput()?.nativeElement.focus();
      const log = this.logBox()?.nativeElement;
      if (log) log.scrollTop = log.scrollHeight;
    }, 30);
  }

  protected submit(): void {
    if (!this.myTurn()) return;
    const text = this.typed().trim().toLowerCase();
    if (!text) return;
    if (!/^[a-z]+$/.test(text)) return this.reject('Faqat bitta inglizcha so\'z yozing (lotin harflari).');
    if (text[0] !== this.letter()) return this.reject(`So'z "${this.letter().toUpperCase()}" harfi bilan boshlanishi kerak.`);
    if (this.chain().some((l) => l.text === text)) return this.reject("Bu so'z allaqachon aytilgan.");
    const entry = this.dict.get(text);
    if (!entry) return this.reject("Bu so'z lug'atimizda yo'q — boshqasini sinab ko'ring.");

    this.turnId++;
    this.chain.update((c) => [...c, { text, translation: entry.translation, by: 'me' }]);
    this.score.update((s) => s + 10 + text.length * 2);
    this.typed.set('');
    this.later(() => {
      const log = this.logBox()?.nativeElement;
      if (log) log.scrollTop = log.scrollHeight;
    }, 30);
    this.botMove();
  }

  private reject(message: string): void {
    this.message.set(message);
    this.invalid.update((n) => n + 1);
  }

  protected hint(): void {
    const used = new Set(this.chain().map((l) => l.text));
    const options = this.botPool.filter((w) => w.text[0] === this.letter() && !used.has(w.text));
    if (!options.length) return;
    this.hintWord.set(options[Math.floor(Math.random() * options.length)]);
    this.hints.update((n) => n + 1);
    this.score.update((s) => Math.max(0, s - 15));
  }

  protected giveUp(): void {
    if (this.phase() !== 'playing') return;
    this.endReason.set("Taslim bo'ldingiz — bot yutdi");
    this.finish();
  }

  private finish(): void {
    this.myTurn.set(false);
    this.turnId++;
    this.finishGame({ score: this.score(), correct: this.myWords(), wrong: this.invalid() + this.hints() });
  }
}
