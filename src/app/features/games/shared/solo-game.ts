import { computed, DestroyRef, Directive, inject, signal } from '@angular/core';
import { problemMessage } from '../../../core/api/problem-details';
import { AppShellService } from '../../../core/layout/app-shell.service';
import { GameResultSaved, GamesService, GameWord, SoloGameType } from '../games.service';
import { GamePhase } from './game-frame';
import { stopSpeaking } from './speech';

/**
 * Yakka o'yinlar uchun umumiy holat: bosqich, soat, so'zlarni yuklash va natijani saqlash.
 * Har bir o'yin shu klassdan meros oladi va o'z qoidalarini qo'shadi.
 */
@Directive()
export abstract class SoloGame {
  protected readonly service = inject(GamesService);
  private readonly shell = inject(AppShellService);
  protected readonly destroyRef = inject(DestroyRef);

  protected abstract readonly gameType: SoloGameType;

  protected readonly phase = signal<GamePhase>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<GameResultSaved | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly elapsedMs = signal(0);
  protected readonly elapsedLabel = computed(() => formatClock(this.elapsedMs()));

  private startedAt = 0;
  private clock: ReturnType<typeof setInterval> | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopClock();
      this.timers.forEach(clearTimeout);
      stopSpeaking();
    });
  }

  /** So'zlarni yuklaydi; `prepare` false qaytarsa — "so'zlar yetarli emas" xatosi. */
  protected fetchWords(count: number, prepare: (words: GameWord[]) => boolean, next: GamePhase = 'ready'): void {
    this.reset();
    this.service.words(count).subscribe({
      next: (list) => {
        if (!prepare(list)) {
          this.fail("O'yin uchun so'zlar yetarli emas.");
          return;
        }
        this.phase.set(next);
        if (next === 'playing') this.startClock();
      },
      error: (err: unknown) => this.fail(problemMessage(err)),
    });
  }

  protected reset(): void {
    this.stopClock();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.phase.set('loading');
    this.error.set(null);
    this.saved.set(null);
    this.saveError.set(null);
    this.elapsedMs.set(0);
  }

  protected fail(message: string): void {
    this.error.set(message);
    this.phase.set('error');
  }

  protected startClock(): void {
    this.stopClock();
    this.startedAt = performance.now();
    this.elapsedMs.set(0);
    this.clock = setInterval(() => this.elapsedMs.set(performance.now() - this.startedAt), 250);
  }

  protected stopClock(): void {
    if (this.clock) {
      clearInterval(this.clock);
      this.elapsedMs.set(performance.now() - this.startedAt);
    }
    this.clock = null;
  }

  /** Komponent yo'q qilinganda yoki o'yin qayta boshlanganda avtomatik bekor qilinadigan setTimeout. */
  protected later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  protected finishGame(result: { score: number; correct: number; wrong: number }): void {
    this.stopClock();
    this.phase.set('saving');
    this.service
      .submitResult({
        gameType: this.gameType,
        score: Math.min(100_000, Math.max(0, Math.round(result.score))),
        correctCount: Math.min(200, result.correct),
        wrongCount: Math.min(500, result.wrong),
        durationMs: Math.min(3_600_000, Math.round(this.elapsedMs())),
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
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Bir xil inglizcha matn yoki bir xil asosiy tarjimali so'zlarni chiqarib tashlaydi. */
export function uniqueWords(list: GameWord[], keep: (w: GameWord) => boolean = () => true): GameWord[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    if (!w.translations.length || !keep(w)) return false;
    const en = w.text.trim().toLowerCase();
    const uz = 'uz:' + w.translations[0].trim().toLowerCase();
    if (seen.has(en) || seen.has(uz)) return false;
    seen.add(en);
    seen.add(uz);
    return true;
  });
}

/** Tarjima ko'rinishi: birinchi ikkitasi vergul bilan. */
export function clueOf(w: GameWord): string {
  return w.translations.slice(0, 2).join(', ');
}
