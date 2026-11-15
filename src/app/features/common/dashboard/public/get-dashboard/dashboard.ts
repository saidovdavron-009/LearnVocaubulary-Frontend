import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { cefrInfo, LevelUp, toCefrLevel } from '../../../../../core/api/cefr';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../../shared/ui/button/button';
import { LevelUpCelebration } from '../../../../../shared/ui/celebration/level-up-celebration';
import {
  ChartGroup,
  ChartSeries,
  GroupedBarChart,
} from '../../../../../shared/ui/chart/grouped-bar-chart';
import { Icon } from '../../../../../shared/ui/icon/icon';
import {
  formatNextReview,
  formatNumber,
  formatUzDate,
} from '../../../../../shared/ui/layout/format';
import { ProgressBar } from '../../../../../shared/ui/progress/progress-bar';
import { ProgressRing } from '../../../../../shared/ui/progress/progress-ring';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tag } from '../../../../../shared/ui/tag/tag';
import { DashboardActivityDay } from './dashboard.models';
import { DashboardService } from './dashboard.service';

type Period = 'week' | 'month' | 'year';

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, year: 365 };
const WEEKDAY_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTH_SHORT = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'Iyn',
  'Iyl',
  'Avg',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
];

/** Diagramma ranglari dataviz validatoridan o'tgan (#5B2EFF va #D9A10F). */
const SERIES: ChartSeries[] = [
  { name: "Yangi so'zlar", color: 'bg-violet' },
  { name: 'Takrorlashlar', color: 'bg-yellow-deep' },
];

const DECK_COLORS = ['bg-yellow text-fg', 'bg-mint text-fg', 'bg-coral text-fg'];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Figma: 05 Dashboard.
 * Har bir blok o'z endpointidan mustaqil yuklanadi (skeleton → ma'lumot / bo'sh / xato).
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    Avatar,
    Button,
    GroupedBarChart,
    Icon,
    ProgressBar,
    ProgressRing,
    Skeleton,
    EmptyState,
    ErrorState,
    Tag,
    LevelUpCelebration,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly service = inject(DashboardService);

  protected readonly series = SERIES;
  protected readonly deckColors = DECK_COLORS;
  protected readonly formatNumber = formatNumber;
  protected readonly Math = Math;
  protected readonly formatNextReview = formatNextReview;

  protected readonly stats = rxResource({ stream: () => this.service.stats() });
  protected readonly queue = rxResource({ stream: () => this.service.queue(4) });
  protected readonly decks = rxResource({ stream: () => this.service.startedDecks() });
  protected readonly leaders = rxResource({ stream: () => this.service.friendsLeaderboard() });
  protected readonly sessions = rxResource({ stream: () => this.service.recentSessions() });
  /** Haftalik o'sish va o'rtacha vaqt uchun har doim 7 kun. */
  protected readonly week = rxResource({ stream: () => this.service.activity(7) });

  protected readonly period = signal<Period>('week');
  protected readonly activity = rxResource({
    params: () => ({ days: PERIOD_DAYS[this.period()] }),
    stream: ({ params }) => this.service.activity(params.days),
  });

  private readonly statsValue = computed(() =>
    this.stats.hasValue() ? this.stats.value() : undefined,
  );

  protected readonly goalLeft = computed(() => {
    const s = this.statsValue();
    return s ? Math.max(0, s.today.dailyGoal - s.today.newWords) : 0;
  });

  private readonly queueValue = computed(() =>
    this.queue.hasValue() ? this.queue.value() : undefined,
  );

  /**
   * Bugun haqiqatan beriladigan yangi so'zlar: kunlik limitdan qolgani, lekin darajada
   * mavjud yangi so'zlardan ko'p emas (navbat daraja bo'yicha filtrlangan).
   */
  protected readonly newAvailable = computed(() => {
    const q = this.queueValue();
    return q ? Math.min(q.newRemainingToday, q.newCount) : 0;
  });

  /** Foydalanuvchi darajasi va undagi progress ("A2 · 34/120"). */
  protected readonly levelInfo = computed(() => {
    const q = this.queueValue();
    const info = cefrInfo(toCefrLevel(q?.cefrLevel));
    return info && q ? { ...info, learned: q.levelLearned, total: q.levelTotal } : null;
  });

  /** Daraja shu sahifada (navbat olinganda) tugatilgan bo'lsa — tabrik oynasi. */
  protected readonly levelUp = signal<LevelUp | null>(null);

  constructor() {
    effect(() => {
      const lu = this.queueValue()?.levelUp;
      if (lu)
        this.levelUp.set({
          from: toCefrLevel(lu.from) ?? lu.from,
          to: toCefrLevel(lu.to),
          wordsLearned: lu.wordsLearned,
        });
    });
  }

  protected closeLevelUp(): void {
    this.levelUp.set(null);
    // Yangi daraja bo'yicha hisoblagichlarni qayta olamiz.
    this.queue.reload();
    this.stats.reload();
  }

  /** Taxminiy vaqt: har bir so'z ~30 soniya. */
  protected readonly estimatedMinutes = computed(() => {
    const q = this.queueValue();
    return q ? Math.ceil((q.dueCount + this.newAvailable()) * 0.5) : 0;
  });

  /** Backend qoidasi (StudyProgress.XpForAnswer): to'g'ri javob 10 XP, yangi so'z uchun +5 bonus. */
  protected readonly possibleXp = computed(() => {
    const q = this.queueValue();
    return q ? q.dueCount * 10 + this.newAvailable() * 15 : 0;
  });

  /** "+28 shu hafta" — so'nggi 7 kunda qo'shilgan yangi so'zlar. */
  protected readonly newThisWeek = computed(() =>
    this.week.hasValue() ? this.week.value().days.reduce((sum, d) => sum + d.newWords, 0) : null,
  );

  /** O'rtacha kunlik vaqt (faol kunlar bo'yicha), daqiqa. */
  protected readonly avgMinutes = computed(() => {
    if (!this.week.hasValue()) return null;
    const active = this.week.value().days.filter((d) => d.minutesSpent > 0);
    if (!active.length) return 0;
    return Math.round(active.reduce((s, d) => s + d.minutesSpent, 0) / active.length);
  });

  /** Aniqlik: so'nggi 20 mashg'ulotdagi to'g'ri javoblar ulushi. */
  protected readonly accuracy = computed(() => {
    if (!this.sessions.hasValue()) return null;
    const list = this.sessions.value();
    const correct = list.reduce((s, x) => s + x.correctCount, 0);
    const total = correct + list.reduce((s, x) => s + x.wrongCount, 0);
    return total ? Math.round((correct / total) * 100) : null;
  });

  protected readonly chartGroups = computed<ChartGroup[]>(() => {
    if (!this.activity.hasValue()) return [];
    const byDate = new Map(this.activity.value().days.map((d) => [d.date, d]));
    const today = new Date();
    const todayIso = isoDate(today);
    const period = this.period();

    if (period === 'year') {
      // Oxirgi 12 oy, oylik yig'indi.
      const months: ChartGroup[] = [];
      for (let i = 11; i >= 0; i--) {
        const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const prefix = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
        const days = this.activity.value().days.filter((d) => d.date.startsWith(prefix));
        months.push({
          label: MONTH_SHORT[m.getMonth()],
          title: `${MONTH_SHORT[m.getMonth()]} ${m.getFullYear()}`,
          values: [sum(days, 'newWords'), sum(days, 'reviews')],
          highlight: i === 0,
        });
      }
      return months;
    }

    const count = PERIOD_DAYS[period];
    const groups: ChartGroup[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = isoDate(d);
      const day = byDate.get(iso);
      groups.push({
        label:
          period === 'week' ? WEEKDAY_SHORT[d.getDay()] : i % 5 === 0 ? String(d.getDate()) : '',
        title: formatUzDate(d),
        values: [day?.newWords ?? 0, day?.reviews ?? 0],
        highlight: iso === todayIso,
      });
    }
    return groups;
  });

  protected initial(text: string): string {
    return text.charAt(0).toUpperCase();
  }
}

function sum(days: DashboardActivityDay[], key: 'newWords' | 'reviews'): number {
  return days.reduce((s, d) => s + d[key], 0);
}
