import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { cefrInfo, LevelUp, toCefrLevel } from '../../../../../core/api/cefr';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { LevelUpCelebration } from '../../../../../shared/ui/celebration/level-up-celebration';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  EarnedAchievement,
  StudyExercise,
  StudyQuestion,
  StudyQueueItem,
  StudyQueueMode,
  StudyResultState,
} from './study-session.models';
import { StudySessionService } from './study-session.service';

const SESSION_SIZE = 30;
const MAX_HEARTS = 5;
/** Yozish mashqi uchun maxsus belgilar (Figma: "Klaviatura"). */
const SPECIAL_KEYS = ['ə', 'ɪ', 'ʃ', 'θ'];

type Phase = 'loading' | 'empty' | 'error' | 'question' | 'feedback' | 'finishing';

interface Feedback {
  correct: boolean;
  /** Yozishda bitta harf xato — "Deyarli!". */
  almost: boolean;
  xp: number;
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Ikki satr orasidagi tahrir masofasi (Levenshtein). */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[’`]/g, "'");

/**
 * Figma: 10 Mashq: Test, 11 Mashq: Tinglash va yozish.
 * Navbat (GET /study/queue) → seans (POST /study/sessions) → har javob (POST .../answers) →
 * yakunlash (POST .../finish) → natija sahifasi. Query: ?mode=new|review, ?deckId=.
 */
@Component({
  selector: 'app-study-session',
  imports: [RouterLink, Button, Icon, EmptyState, ErrorState, LevelUpCelebration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-page', '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './study-session.html',
})
export class StudySession implements OnInit {
  private readonly service = inject(StudySessionService);
  private readonly shell = inject(AppShellService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Router query parametrlari (withComponentInputBinding). */
  readonly mode = input<string | undefined>(undefined);
  readonly deckId = input<string | undefined>(undefined);

  protected readonly specialKeys = SPECIAL_KEYS;
  protected readonly maxHearts = MAX_HEARTS;
  protected readonly formatNumber = formatNumber;
  protected readonly Math = Math;

  protected readonly phase = signal<Phase>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly questions = signal<StudyQuestion[]>([]);
  protected readonly index = signal(0);
  protected readonly answered = signal(0);
  protected readonly sessionXp = signal(0);
  protected readonly wrong = signal(0);
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly selected = signal<string | null>(null);
  protected readonly typed = signal('');
  protected readonly submitting = signal(false);
  protected readonly speaking = signal(false);

  /** Foydalanuvchi darajasi va undagi progress (umumiy mashqda). */
  protected readonly levelCode = signal<string | null>(null);
  protected readonly levelTotal = signal(0);
  protected readonly levelLearned = signal(0);
  protected readonly level = computed(() => cefrInfo(toCefrLevel(this.levelCode())));
  /** Daraja tugatildi — tabrik oynasi ko'rsatiladi. */
  protected readonly levelUp = signal<LevelUp | null>(null);

  protected readonly emptyTitle = computed(() =>
    this.level() ? `${this.level()!.code} darajasida hozircha mashq yo'q` : "Hozircha mashq qiladigan so'z yo'q",
  );
  protected readonly emptyText = computed(() => {
    const lv = this.level();
    if (!lv) return "Lug'atdan yangi so'zlar qo'shing yoki to'plam boshlang.";
    if (this.levelTotal() === 0)
      return `${lv.code} darajasida hali so'zlar yo'q. Sozlamalardan boshqa darajani tanlashingiz mumkin.`;
    return `Bugungi yangi so'zlar limiti tugadi yoki takrorlash vaqti kelmadi. ${lv.code}: ${this.levelLearned()} / ${this.levelTotal()} so'z o'rganilgan — ertaga davom etamiz!`;
  });

  private sessionId: number | null = null;
  private questionStartedAt = 0;
  private soundOn = true;
  private levelBefore = 1;
  private readonly achievements: EarnedAchievement[] = [];
  private audioCtx: AudioContext | null = null;
  private readonly canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');

  protected readonly current = computed(() => this.questions()[this.index()] ?? null);
  protected readonly total = computed(() => this.questions().length);
  protected readonly progress = computed(() => (this.total() ? (this.answered() / this.total()) * 100 : 0));
  protected readonly hearts = computed(() => Math.max(0, MAX_HEARTS - this.wrong()));
  protected readonly correctAnswer = computed(() => this.current()?.item.translations[0] ?? '');

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.canSpeak) window.speechSynthesis.cancel();
      void this.audioCtx?.close();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.phase.set('loading');
    this.error.set(null);
    const mode: StudyQueueMode = this.mode() === 'new' || this.mode() === 'review' ? (this.mode() as StudyQueueMode) : 'all';
    const deckId = Number(this.deckId()) || null;
    this.levelBefore = this.shell.stats()?.level ?? 1;

    forkJoin({
      queue: this.service.queue(SESSION_SIZE, mode, deckId),
      sound: this.service.soundEnabled(),
    }).subscribe({
      next: ({ queue, sound }) => {
        this.soundOn = sound;
        this.levelCode.set(queue.cefrLevel);
        this.levelTotal.set(queue.levelTotal);
        this.levelLearned.set(queue.levelLearned);
        if (queue.levelUp) this.celebrate(queue.levelUp);
        if (!queue.items.length) {
          this.phase.set('empty');
          return;
        }
        this.questions.set(queue.items.map((item, i) => this.buildQuestion(item, i)));
        this.service.start().subscribe({
          next: (s) => {
            this.sessionId = s.id;
            this.showQuestion(0);
          },
          error: (err: unknown) => this.fail(err),
        });
      },
      error: (err: unknown) => this.fail(err),
    });
  }

  private fail(err: unknown): void {
    this.error.set(problemMessage(err));
    this.phase.set('error');
  }

  /** Juft savollar — test (variantlar yetarli bo'lsa), toq — tinglab yozish (ovoz bo'lsa), aks holda yozish. */
  private buildQuestion(item: StudyQueueItem, i: number): StudyQuestion {
    const canTest = item.translations.length > 0 && item.distractors.length >= 3;
    const canListen = !!item.audioUrl || this.canSpeak;
    let exercise: StudyExercise = i % 2 === 0 && canTest ? 'multiple_choice' : canListen ? 'listening' : 'typing';
    if (exercise !== 'multiple_choice' && !item.translations.length && !canListen) exercise = 'multiple_choice';
    const options = canTest ? shuffle([item.translations[0], ...item.distractors.slice(0, 3)]) : [];
    return { item, exercise: exercise === 'multiple_choice' && !canTest ? 'typing' : exercise, options };
  }

  private showQuestion(i: number): void {
    this.index.set(i);
    this.selected.set(null);
    this.typed.set('');
    this.feedback.set(null);
    this.phase.set('question');
    this.questionStartedAt = performance.now();
    const q = this.current();
    if (q?.exercise === 'listening') setTimeout(() => this.speak(), 250);
    if (q && q.exercise !== 'multiple_choice') setTimeout(() => this.answerInput()?.nativeElement.focus(), 50);
  }

  protected speak(slow = false): void {
    const item = this.current()?.item;
    if (!item) return;
    if (item.audioUrl && !slow) {
      const audio = new Audio(item.audioUrl);
      this.speaking.set(true);
      audio.onended = audio.onerror = () => this.speaking.set(false);
      void audio.play().catch(() => this.speaking.set(false));
      return;
    }
    if (!this.canSpeak) return;
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'en-US';
    u.rate = slow ? 0.55 : 0.9;
    u.onend = u.onerror = () => this.speaking.set(false);
    this.speaking.set(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  protected choose(option: string): void {
    if (this.phase() !== 'question' || this.submitting()) return;
    this.selected.set(option);
    this.submit(normalize(option) === normalize(this.correctAnswer()), false);
  }

  protected checkTyped(): void {
    const q = this.current();
    if (!q || this.phase() !== 'question' || this.submitting() || !this.typed().trim()) return;
    const given = normalize(this.typed());
    const target = normalize(q.item.text);
    const correct = given === target;
    this.submit(correct, !correct && distance(given, target) === 1);
  }

  protected insertKey(key: string): void {
    this.typed.update((t) => t + key);
    this.answerInput()?.nativeElement.focus();
  }

  private submit(correct: boolean, almost: boolean): void {
    const q = this.current();
    if (!q || this.sessionId === null) return;
    const ms = Math.round(performance.now() - this.questionStartedAt);
    this.submitting.set(true);
    this.service
      .submit({
        sessionId: this.sessionId,
        wordId: q.item.wordId,
        rating: !correct ? 'again' : ms < 4000 ? 'easy' : 'good',
        exerciseType: q.exercise,
        responseTimeMs: ms,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.answered.update((n) => n + 1);
          this.sessionXp.set(res.session.xpEarned);
          if (!res.isCorrect) this.wrong.update((n) => n + 1);
          this.achievements.push(...res.newAchievements);
          if (res.status === 'review' || res.status === 'mastered') this.trackLearned(q.item);
          if (res.levelUp) this.celebrate(res.levelUp);
          this.feedback.set({ correct: res.isCorrect, almost, xp: res.xpEarned });
          this.phase.set('feedback');
          this.beep(res.isCorrect);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.selected.set(null);
          this.toast.error(problemMessage(err));
        },
      });
  }

  /** So'z shu javob bilan "o'rganilgan" bo'lgan bo'lsa — daraja progressini oshiramiz. */
  private trackLearned(item: StudyQueueItem): void {
    const wasLearned = item.status === 'review' || item.status === 'mastered';
    if (!wasLearned && this.level() && toCefrLevel(item.cefrLevel) === this.level()!.value) {
      this.levelLearned.update((n) => Math.min(n + 1, this.levelTotal()));
      item.status = 'review';
    }
  }

  private celebrate(levelUp: LevelUp): void {
    const normalized: LevelUp = {
      from: toCefrLevel(levelUp.from) ?? levelUp.from,
      to: toCefrLevel(levelUp.to),
      wordsLearned: levelUp.wordsLearned,
    };
    this.levelUp.set(normalized);
    // Header'dagi nishon yangi darajani ko'rsatsin (progress keyingi navbatda yangilanadi).
    if (normalized.to) {
      this.levelCode.set(normalized.to);
      this.levelLearned.set(0);
      this.levelTotal.set(0);
    }
    this.shell.refreshProfile();
    this.fanfare();
  }

  protected next(): void {
    if (this.phase() !== 'feedback') return;
    const nextIndex = this.index() + 1;
    if (nextIndex >= this.total() || this.hearts() === 0) {
      this.finish();
      return;
    }
    this.showQuestion(nextIndex);
  }

  /** Seansni yakunlaydi. Hech javob berilmagan bo'lsa — shunchaki bosh sahifaga. */
  protected finish(): void {
    if (this.sessionId === null || this.answered() === 0) {
      void this.router.navigate(['/dashboard']);
      return;
    }
    this.phase.set('finishing');
    const id = this.sessionId;
    this.service.finish(id).subscribe({
      next: () => this.goToResult(id),
      // Seans allaqachon yakunlangan bo'lsa ham natijani ko'rsatamiz.
      error: () => this.goToResult(id),
    });
  }

  private goToResult(id: number): void {
    this.shell.refreshStats();
    const state: StudyResultState = { achievements: this.achievements, levelBefore: this.levelBefore };
    void this.router.navigate(['/study/result', id], { state, replaceUrl: true });
  }

  protected optionState(option: string): 'idle' | 'correct' | 'wrong' | 'dim' {
    if (this.phase() !== 'feedback') return 'idle';
    if (normalize(option) === normalize(this.correctAnswer())) return 'correct';
    if (option === this.selected()) return 'wrong';
    return 'dim';
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Tabrik oynasi ochiq bo'lsa, klaviatura uning tugmasiga tegishli.
    if (this.levelUp()) return;
    const target = event.target as HTMLElement | null;
    const typing = target?.tagName === 'INPUT';
    if (event.key === 'Enter') {
      if (this.phase() === 'feedback') {
        event.preventDefault();
        this.next();
      } else if (typing) {
        event.preventDefault();
        this.checkTyped();
      }
      return;
    }
    const q = this.current();
    if (!typing && this.phase() === 'question' && q?.exercise === 'multiple_choice' && /^[1-4]$/.test(event.key)) {
      const option = q.options[Number(event.key) - 1];
      if (option) this.choose(option);
    }
  }

  protected onTyped(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
  }

  /** Tabrik ohangi: ko'tariluvchi arpedjio (ovoz yoqilgan bo'lsa). */
  private fanfare(): void {
    if (!this.soundOn || typeof AudioContext === 'undefined') return;
    try {
      this.audioCtx ??= new AudioContext();
      const ctx = this.audioCtx;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'triangle';
        const t = ctx.currentTime + 0.25 + i * 0.12;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === 3 ? 0.6 : 0.2));
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    } catch {
      // Ovoz chiqmasa ham tabrik ko'rsatiladi.
    }
  }

  /** Qisqa ovozli signal (sozlamada "Ovozli effektlar" yoqilgan bo'lsa). */
  private beep(correct: boolean): void {
    if (!this.soundOn || typeof AudioContext === 'undefined') return;
    try {
      this.audioCtx ??= new AudioContext();
      const ctx = this.audioCtx;
      const notes = correct ? [660, 880] : [300, 220];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch {
      // Ovoz chiqmasa mashq davom etaveradi.
    }
  }
}
