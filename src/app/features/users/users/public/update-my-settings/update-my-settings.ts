import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, Subject, switchMap } from 'rxjs';
import { CEFR_LEVELS, cefrInfo, toCefrLevel } from '../../../../../core/api/cefr';
import { CefrLevel } from '../../../../../core/api/enums';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Select, SelectOption } from '../../../../../shared/ui/select/select';
import { normalizeTime, REMINDER_TIME_OPTIONS } from '../../../../../shared/ui/select/time-options';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Toggle } from '../../../../../shared/ui/toggle/toggle';
import { UpdateMySettingsRequest } from './update-my-settings.models';
import { UpdateMySettingsService } from './update-my-settings.service';

const DAILY_GOALS = [5, 10, 15, 20];

/**
 * Figma: 17 — "O'rganish sozlamalari" va "Eslatmalar" kartalari.
 * Har bir o'zgarish avtomatik saqlanadi (PUT /api/profile/me/settings).
 */
@Component({
  selector: 'app-update-my-settings',
  imports: [Icon, Select, Skeleton, ErrorState, Toggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './update-my-settings.html',
})
export class UpdateMySettings implements OnInit {
  private readonly service = inject(UpdateMySettingsService);
  private readonly shell = inject(AppShellService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dailyGoals = DAILY_GOALS;
  protected readonly levels = CEFR_LEVELS;
  protected readonly timeOptions = REMINDER_TIME_OPTIONS;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  protected readonly languageOptions = signal<SelectOption<number>[]>([]);
  protected readonly telegramConnected = signal(false);

  protected readonly value = signal<UpdateMySettingsRequest>({
    learningLanguageId: null,
    cefrLevel: null,
    dailyGoalWords: 10,
    newWordsPerDay: 30,
    reminderEnabled: false,
    reminderTime: '20:00:00',
    soundEnabled: true,
  });
  protected readonly selectedLevel = computed(() => cefrInfo(this.value().cefrLevel));

  /** Slayder chegarasi: odatda 50, backend 200 gacha ruxsat beradi. */
  protected readonly newWordsMax = computed(() => Math.max(50, this.value().newWordsPerDay));
  protected readonly newWordsPercent = computed(() => (this.value().newWordsPerDay / this.newWordsMax()) * 100);

  private readonly save$ = new Subject<number>();

  ngOnInit(): void {
    this.save$
      .pipe(
        debounceTime(400),
        switchMap(() => {
          this.saveState.set('saving');
          return this.service.update(this.value()).pipe(
            map(() => true),
            catchError(() => of(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ok) => {
        this.saveState.set(ok ? 'saved' : 'error');
        if (ok) this.shell.refreshStats();
      });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.service.load().subscribe({
      next: ({ settings, languages }) => {
        this.languageOptions.set(languages.map((l) => ({ value: l.id, label: l.name })));
        this.telegramConnected.set(settings.telegramConnected);
        this.value.set({
          learningLanguageId: settings.learningLanguageId,
          cefrLevel: toCefrLevel(settings.cefrLevel),
          dailyGoalWords: settings.dailyGoalWords,
          newWordsPerDay: settings.newWordsPerDay,
          reminderEnabled: settings.reminderEnabled,
          reminderTime: normalizeTime(settings.reminderTime) ?? '20:00:00',
          soundEnabled: settings.soundEnabled,
        });
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.loadError.set(problemMessage(err));
        this.state.set('error');
      },
    });
  }

  protected patch(change: Partial<UpdateMySettingsRequest>): void {
    this.value.update((v) => ({ ...v, ...change }));
    this.save$.next(Date.now());
  }

  protected onLevel(level: CefrLevel): void {
    if (level !== this.value().cefrLevel) this.patch({ cefrLevel: level });
  }

  protected onLanguage(value: string | number | null): void {
    this.patch({ learningLanguageId: typeof value === 'number' ? value : null });
  }

  protected onReminderTime(value: string | number | null): void {
    if (typeof value === 'string') this.patch({ reminderTime: value });
  }

  protected onNewWords(event: Event): void {
    this.patch({ newWordsPerDay: Number((event.target as HTMLInputElement).value) });
  }
}
