import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CEFR_LEVELS, cefrInfo, toCefrLevel } from '../../../../../core/api/cefr';
import { CefrLevel } from '../../../../../core/api/enums';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { Logo } from '../../../../../shared/ui/logo/logo';
import { Select } from '../../../../../shared/ui/select/select';
import { normalizeTime, REMINDER_TIME_OPTIONS } from '../../../../../shared/ui/select/time-options';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tag, TagColor } from '../../../../../shared/ui/tag/tag';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { Toggle } from '../../../../../shared/ui/toggle/toggle';
import { OnboardingLanguage, OnboardingProfile, OnboardingSettings } from './onboarding.models';
import { OnboardingService } from './onboarding.service';

type Step = 0 | 1 | 2 | 3;

interface GoalOption {
  words: number;
  label: string;
  tag: TagColor;
}

/** Figma: 04 "Kuniga nechta yangi so'z?" kartalari. */
const GOALS: GoalOption[] = [
  { words: 5, label: 'Yengil', tag: 'blue' },
  { words: 10, label: 'Oddiy', tag: 'yellow' },
  { words: 15, label: 'Jiddiy', tag: 'yellow' },
  { words: 20, label: "Qizg'in", tag: 'coral' },
];

const STEPS = ['Til', 'Daraja', 'Maqsad', 'Eslatma'] as const;
const LAST_STEP: Step = 3;

/**
 * Figma: 04 Onboarding. 4 qadam:
 * Til (ona tili + o'rganiladigan til) → Daraja (A1–C2) → Kunlik maqsad → Eslatma.
 * Oxirida PUT /api/profile/me (ona tili) va PUT /api/profile/me/settings.
 */
@Component({
  selector: 'app-onboarding',
  imports: [RouterLink, Button, Icon, Logo, Select, Skeleton, ErrorState, Tag, Toggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-page' },
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  private readonly service = inject(OnboardingService);
  private readonly shell = inject(AppShellService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly steps = STEPS;
  protected readonly goals = GOALS;
  protected readonly levels = CEFR_LEVELS;
  protected readonly timeOptions = REMINDER_TIME_OPTIONS;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly step = signal<Step>(0);

  protected readonly languages = signal<OnboardingLanguage[]>([]);
  private profile: OnboardingProfile | null = null;
  private settings: OnboardingSettings | null = null;

  protected readonly nativeLanguageId = signal<number | null>(null);
  protected readonly learningLanguageId = signal<number | null>(null);
  protected readonly cefrLevel = signal<CefrLevel | null>(null);
  protected readonly selectedLevel = computed(() => cefrInfo(this.cefrLevel()));
  protected readonly dailyGoal = signal(10);
  protected readonly reminderEnabled = signal(true);
  protected readonly reminderTime = signal<string>('20:00:00');
  protected readonly soundEnabled = signal(true);

  protected readonly nativeLanguage = computed(() => this.languages().find((l) => l.id === this.nativeLanguageId()));
  protected readonly learningLanguage = computed(() =>
    this.languages().find((l) => l.id === this.learningLanguageId()),
  );
  /** O'rganiladigan til ona tilidan farqli bo'lishi kerak. */
  protected readonly learningOptions = computed(() =>
    this.languages().filter((l) => l.id !== this.nativeLanguageId()),
  );
  protected readonly canContinue = computed(() => {
    if (this.step() === 0) return this.nativeLanguageId() !== null && this.learningLanguageId() !== null;
    if (this.step() === 1) return this.cefrLevel() !== null;
    return true;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.service.load().subscribe({
      next: ({ languages, profile, settings }) => {
        this.languages.set(languages);
        this.profile = profile;
        this.settings = settings;
        this.nativeLanguageId.set(
          profile.nativeLanguageId ?? languages.find((l) => l.code === 'uz')?.id ?? null,
        );
        this.learningLanguageId.set(settings.learningLanguageId);
        this.cefrLevel.set(toCefrLevel(settings.cefrLevel));
        this.dailyGoal.set(GOALS.some((g) => g.words === settings.dailyGoalWords) ? settings.dailyGoalWords : 10);
        this.reminderEnabled.set(settings.reminderEnabled);
        this.reminderTime.set(normalizeTime(settings.reminderTime) ?? '20:00:00');
        this.soundEnabled.set(settings.soundEnabled);
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.loadError.set(problemMessage(err));
        this.state.set('error');
      },
    });
  }

  protected selectNative(id: number): void {
    this.nativeLanguageId.set(id);
    if (this.learningLanguageId() === id) this.learningLanguageId.set(null);
  }

  protected languageIcon(code: string): IconName {
    return code === 'uz' ? 'globe' : 'book';
  }

  protected back(): void {
    if (this.step() > 0) this.step.update((s) => (s - 1) as Step);
  }

  protected next(): void {
    if (!this.canContinue()) return;
    if (this.step() < LAST_STEP) {
      this.step.update((s) => (s + 1) as Step);
      return;
    }
    this.finish();
  }

  protected onReminderTime(value: string | number | null): void {
    if (typeof value === 'string') this.reminderTime.set(value);
  }

  private finish(): void {
    const profile = this.profile;
    const settings = this.settings;
    if (!profile || !settings) return;
    this.saving.set(true);
    this.service
      .save(
        {
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          nativeLanguageId: this.nativeLanguageId(),
          timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tashkent',
        },
        {
          learningLanguageId: this.learningLanguageId(),
          cefrLevel: this.cefrLevel(),
          dailyGoalWords: this.dailyGoal(),
          newWordsPerDay: settings.newWordsPerDay,
          reminderEnabled: this.reminderEnabled(),
          reminderTime: this.reminderTime(),
          soundEnabled: this.soundEnabled(),
        },
      )
      .subscribe({
        next: () => {
          this.shell.refreshProfile();
          this.shell.refreshStats();
          this.toast.success('Hammasi tayyor! Omad.');
          void this.router.navigate(['/dashboard']);
        },
        error: () => this.saving.set(false),
      });
  }
}
