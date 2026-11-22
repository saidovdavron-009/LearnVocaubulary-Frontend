import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { shuffle } from '../../../games.service';
import { GameFrame } from '../../../shared/game-frame';
import { GameIntro, GameRule } from '../../../shared/game-intro';
import { GameResult, ResultWord } from '../../../shared/game-result';
import { CATEGORY_INFO, PICTURE_WORDS, PictureCategory, PictureWord } from '../../../shared/pictures';
import { SoloGame } from '../../../shared/solo-game';

const ROUNDS = 3;
const PER_BOX = 3;

interface Chip {
  id: number;
  word: PictureWord;
  placed: boolean;
}

/**
 * Toifaga ajrat: inglizcha so'zlarni qutilarga (meva, hayvon, kiyim...) joylash.
 * So'zni bosing, keyin qutini bosing — yoki kompyuterda sudrab tashlang.
 * Ball: birinchi urinishda to'g'ri — 50, keyingi urinishda — 20.
 */
@Component({
  selector: 'app-categories',
  imports: [Icon, GameFrame, GameIntro, GameResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <app-game-frame [phase]="phase()" [error]="error()" [progress]="phase() === 'playing' ? progress() : null" barClass="bg-mint" (retry)="load()">
      <ng-container chips>
        @if (phase() === 'playing') {
          <span class="shrink-0 text-body-strong text-fg-secondary">{{ round() + 1 }} / {{ rounds }}</span>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-soft py-2.5 pr-3.5 pl-3 text-body-strong text-fg">
            <app-icon name="star" [size]="18" class="text-yellow-text" /> {{ score() }}
          </span>
        }
      </ng-container>

      @switch (phase()) {
        @case ('ready') {
          <app-game-intro
            title="Toifaga ajrat"
            text="Inglizcha so'zlarni to'g'ri qutilarga joylang: meva, hayvon, kiyim va boshqalar."
            icon="layers"
            iconClass="bg-mint text-fg-inverse"
            [rules]="rules"
            (start)="start()"
          />
        }
        @case ('playing') {
          <section class="flex w-full max-w-190 flex-col gap-6">
            <!-- So'zlar -->
            <div class="flex min-h-16 flex-wrap justify-center gap-2.5" aria-label="So'zlar">
              @for (chip of chips(); track chip.id) {
                @if (!chip.placed) {
                  <button
                    type="button"
                    draggable="true"
                    class="rounded-full border-2 px-4 py-2 text-body-lg font-semibold shadow-hard transition-[translate,box-shadow,background-color,border-color] duration-150"
                    [class]="
                      wrongChip() === chip.id
                        ? 'shake border-coral-strong bg-coral-soft text-coral-text shadow-coral-strong'
                        : selected() === chip.id
                          ? '-translate-y-1 border-violet bg-violet text-fg-inverse shadow-violet-deep'
                          : 'border-line bg-surface text-fg shadow-line hover:border-violet'
                    "
                    [attr.aria-pressed]="selected() === chip.id"
                    (click)="select(chip)"
                    (dragstart)="onDragStart($event, chip)"
                  >
                    {{ chip.word.en }}
                  </button>
                }
              }
            </div>

            <!-- Qutilar -->
            <div class="grid gap-3 sm:grid-cols-3">
              @for (cat of boxes(); track cat) {
                <button
                  type="button"
                  class="flex min-h-40 flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-4 text-center transition-colors"
                  [class]="over() === cat ? 'border-violet bg-violet-soft' : selected() !== null ? 'border-violet/60 bg-surface hover:bg-violet-soft' : 'border-line-strong bg-surface'"
                  [attr.aria-label]="info[cat].name + ' qutisi'"
                  (click)="drop(cat)"
                  (dragover)="$event.preventDefault(); over.set(cat)"
                  (dragleave)="over.set(null)"
                  (drop)="$event.preventDefault(); over.set(null); drop(cat)"
                >
                  <span class="text-[40px] leading-none" aria-hidden="true">{{ info[cat].emoji }}</span>
                  <span class="text-body-strong text-fg">{{ info[cat].name }}</span>
                  <span class="flex flex-wrap justify-center gap-1.5">
                    @for (chip of placedIn(cat); track chip.id) {
                      <span class="pop-in rounded-full bg-mint-soft px-2.5 py-1 text-label text-mint-text">{{ chip.word.en }} {{ chip.word.emoji }}</span>
                    }
                  </span>
                </button>
              }
            </div>
            <p class="text-center text-caption text-fg-muted">So'zni bosing, keyin qutini bosing (kompyuterda sudrab tashlash ham mumkin)</p>
          </section>
        }
        @case ('done') {
          <app-game-result
            title="Hammasi joyida!"
            [score]="score()"
            [saved]="saved()"
            [saveError]="saveError()"
            [stats]="[
              { value: firstTry() + ' / ' + total(), label: 'birinchi urinishda', tone: 'mint' },
              { value: mistakes(), label: 'xato', tone: 'coral' },
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
export class Categories extends SoloGame {
  protected readonly gameType = 'categories' as const;
  protected readonly info = CATEGORY_INFO;
  protected readonly rounds = ROUNDS;
  protected readonly rules: GameRule[] = [
    { icon: 'check', text: 'Birinchi urinishda to\'g\'ri — 50 ball, keyin — 20 ball' },
    { icon: 'layers', text: `${ROUNDS} ta raund, har birida 3 ta quti va ${PER_BOX * 3} ta so'z`, tone: 'violet' },
  ];

  protected readonly round = signal(0);
  protected readonly boxes = signal<PictureCategory[]>([]);
  protected readonly chips = signal<Chip[]>([]);
  protected readonly selected = signal<number | null>(null);
  protected readonly over = signal<PictureCategory | null>(null);
  protected readonly wrongChip = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly mistakes = signal(0);
  protected readonly firstTry = signal(0);
  protected readonly total = signal(0);
  protected readonly played = signal<PictureWord[]>([]);

  private missedIds = new Set<number>();
  private chipId = 0;

  protected readonly progress = computed(() => {
    const placed = this.chips().filter((c) => c.placed).length;
    return (this.round() + placed / Math.max(1, this.chips().length)) / ROUNDS;
  });
  protected readonly resultWords = computed<ResultWord[]>(() => this.played().map((w) => ({ en: `${w.emoji} ${w.en}`, uz: w.uz })));

  constructor() {
    super();
    this.load();
  }

  protected load(): void {
    this.reset();
    this.phase.set('ready');
  }

  protected start(): void {
    this.round.set(0);
    this.score.set(0);
    this.mistakes.set(0);
    this.firstTry.set(0);
    this.total.set(0);
    this.played.set([]);
    this.phase.set('playing');
    this.startClock();
    this.setupRound();
  }

  private setupRound(): void {
    const all = Object.keys(CATEGORY_INFO) as PictureCategory[];
    const cats = shuffle(all).slice(0, 3);
    const words = cats.flatMap((c) => shuffle(PICTURE_WORDS.filter((w) => w.category === c && !this.played().includes(w))).slice(0, PER_BOX));
    this.boxes.set(cats);
    this.chips.set(shuffle(words).map((word) => ({ id: this.chipId++, word, placed: false })));
    this.selected.set(null);
    this.missedIds.clear();
  }

  protected select(chip: Chip): void {
    this.selected.set(this.selected() === chip.id ? null : chip.id);
  }

  protected onDragStart(event: DragEvent, chip: Chip): void {
    this.selected.set(chip.id);
    event.dataTransfer?.setData('text/plain', String(chip.id));
  }

  protected placedIn(cat: PictureCategory): Chip[] {
    return this.chips().filter((c) => c.placed && c.word.category === cat);
  }

  protected drop(cat: PictureCategory): void {
    const chip = this.chips().find((c) => c.id === this.selected());
    if (!chip) return;
    this.selected.set(null);
    if (chip.word.category !== cat) {
      this.mistakes.update((n) => n + 1);
      this.missedIds.add(chip.id);
      this.wrongChip.set(chip.id);
      this.later(() => this.wrongChip.set(null), 500);
      return;
    }
    const first = !this.missedIds.has(chip.id);
    this.score.update((s) => s + (first ? 50 : 20));
    if (first) this.firstTry.update((n) => n + 1);
    this.total.update((n) => n + 1);
    this.played.update((list) => [...list, chip.word]);
    this.chips.update((list) => list.map((c) => (c.id === chip.id ? { ...c, placed: true } : c)));

    if (this.chips().every((c) => c.placed)) {
      this.later(() => {
        if (this.round() + 1 >= ROUNDS) {
          this.finishGame({ score: this.score(), correct: this.firstTry(), wrong: this.mistakes() });
          return;
        }
        this.round.update((r) => r + 1);
        this.setupRound();
      }, 700);
    }
  }
}
