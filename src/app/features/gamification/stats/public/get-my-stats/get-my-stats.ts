import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ExerciseType } from '../../../../../core/api/enums';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { ActivityResponse, GetMyStatsService } from './get-my-stats.service';

type Period = '7' | '30' | '90' | 'all';

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: '7', label: '7 kun', days: 7 },
  { id: '30', label: '30 kun', days: 30 },
  { id: '90', label: '3 oy', days: 90 },
  { id: 'all', label: 'Hammasi', days: 366 },
];

const EXERCISES: { type: ExerciseType; label: string; icon: IconName }[] = [
  { type: 'flashcard', label: 'Kartochkalar', icon: 'cards' },
  { type: 'multiple_choice', label: 'Test', icon: 'choice' },
  { type: 'matching', label: 'Juftlash', icon: 'link' },
  { type: 'listening', label: 'Tinglash', icon: 'headphones' },
  { type: 'fill_blank', label: "Bo'shliq to'ldirish", icon: 'blank' },
  { type: 'typing', label: 'Yozish', icon: 'keyboard' },
];

const WEEKDAY_ROWS = ['Du', '', 'Ch', '', 'Ju', '', 'Ya'];
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const MONTHS_LONG = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
/** Faollik kalendari darajalari (Figma: Kam → Ko'p). */
const HEAT = ['bg-muted', 'bg-line-strong', 'bg-blue', 'bg-violet', 'bg-violet-deep'];

/** Yutuq ikonkasi va rangi shart turiga qarab. */
const ACHIEVEMENT_STYLE: Record<string, { icon: IconName; box: string }> = {
  words_learned: { icon: 'book', box: 'bg-mint' },
  streak_days: { icon: 'flame', box: 'bg-coral' },
  total_reviews: { icon: 'star', box: 'bg-yellow' },
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Figma: 14 Statistika va yutuqlar. Davr tablari, 5 ta ko'rsatkich, faollik kalendari (1 yil),
 * kunlik XP diagrammasi, so'zlar holati (donut), mashq turlari bo'yicha aniqlik, yutuqlar.
 */
@Component({
  selector: 'app-get-my-stats',
  imports: [Icon, Skeleton, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './get-my-stats.html',
})
export class GetMyStats {
  private readonly service = inject(GetMyStatsService);

  protected readonly periods = PERIODS;
  protected readonly weekdayRows = WEEKDAY_ROWS;
  protected readonly heat = HEAT;
  protected readonly formatNumber = formatNumber;

  protected readonly period = signal<Period>('30');
  private readonly periodDays = computed(() => PERIODS.find((p) => p.id === this.period())!.days);

  protected readonly stats = rxResource({ stream: () => this.service.stats() });
  /** Kalendar uchun har doim 1 yil. */
  protected readonly year = rxResource({ stream: () => this.service.activity(366) });
  protected readonly activity = rxResource({
    params: () => ({ days: this.periodDays() }),
    stream: ({ params }) => this.service.activity(params.days),
  });
  protected readonly accuracy = rxResource({
    params: () => ({ days: this.period() === 'all' ? null : this.periodDays() }),
    stream: ({ params }) => this.service.accuracy(params.days),
  });
  protected readonly achievements = rxResource({ stream: () => this.service.achievements() });

  constructor() {
    inject(AppShellService).setPageHeader('Statistika', "O'rganish tarixingiz va yutuqlaringiz");
  }

  private readonly statsValue = computed(() => (this.stats.hasValue() ? this.stats.value() : null));
  private readonly activityValue = computed(() => (this.activity.hasValue() ? this.activity.value() : null));

  /** Yuqoridagi 5 ta kartochka. "Hammasi"da umumiy statistika, aks holda tanlangan davr. */
  protected readonly cards = computed(() => {
    const s = this.statsValue();
    const a = this.activityValue();
    const acc = this.accuracy.hasValue() ? this.accuracy.value() : null;
    if (!s || !a) return null;
    const all = this.period() === 'all';
    const minutes = a.days.reduce((sum, d) => sum + d.minutesSpent, 0);
    return [
      { value: formatNumber(all ? s.xp : a.totalXp), label: all ? 'Jami XP' : 'Davrdagi XP', icon: 'bolt' as IconName, box: 'bg-yellow text-fg shadow-yellow-deep' },
      { value: `${s.longestStreak} kun`, label: 'Eng uzun seriya', icon: 'flame' as IconName, box: 'bg-coral text-fg shadow-[#e0664a]' },
      { value: formatNumber(all ? s.totalReviews : a.totalReviews), label: 'Takrorlashlar', icon: 'refresh' as IconName, box: 'bg-violet text-fg-inverse shadow-violet-deep' },
      { value: acc && acc.totalAnswers ? `${acc.accuracyPercent}%` : '—', label: "O'rtacha aniqlik", icon: 'target' as IconName, box: 'bg-mint text-fg shadow-mint-deep' },
      {
        value: minutes >= 60 ? `${(minutes / 60).toFixed(1)} soat` : `${minutes} daq`,
        label: 'Umumiy vaqt',
        icon: 'clock' as IconName,
        box: 'bg-blue text-fg shadow-[#5c84e0]',
      },
    ];
  });

  /** Faollik kalendari: haftalar (ustunlar) × kunlar (Du..Ya), oy yorliqlari bilan. */
  protected readonly calendar = computed(() => {
    if (!this.year.hasValue()) return null;
    const byDate = new Map(this.year.value().days.map((d) => [d.date, d.reviews + d.newWords]));
    const max = Math.max(1, ...byDate.values());
    const today = new Date();
    // Bugundan 52 hafta oldingi dushanbadan boshlaymiz.
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 51 * 7);
    const weeks: { level: number; title: string; future: boolean }[][] = [];
    const months: { label: string; col: number }[] = [];
    for (let w = 0; w < 52; w++) {
      const col: { level: number; title: string; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const count = byDate.get(iso(date)) ?? 0;
        const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
        col.push({ level, title: `${date.getDate()}-${MONTHS_LONG[date.getMonth()]}: ${count} ta mashq`, future: date > today });
        if (d === 0 && date.getDate() <= 7) months.push({ label: MONTHS[date.getMonth()], col: w });
      }
      weeks.push(col);
    }
    return { weeks, months };
  });

  /** Kunlik XP diagrammasi: 7/30 kun — kunlik, 3 oy — haftalik, hammasi — oylik ustunlar. */
  protected readonly xpChart = computed(() => {
    const a = this.activityValue();
    if (!a) return null;
    const period = this.period();
    const bars: { value: number; label: string; title: string; today: boolean }[] = [];
    if (period === '7' || period === '30') {
      a.days.forEach((d, i) => {
        const date = new Date(d.date);
        const last = i === a.days.length - 1;
        // Oxirgi ustun "Bugun"; unga yaqin (3 kun) yorliqlar ustma-ust tushmasligi uchun yashiriladi.
        const nearEnd = period === '30' && a.days.length - 1 - i < 4;
        const label = last ? 'Bugun' : !nearEnd && i % (period === '7' ? 1 : 7) === 0 ? `${date.getDate()}-${MONTHS_LONG[date.getMonth()]}` : '';
        bars.push({ value: d.xp, label, title: `${date.getDate()}-${MONTHS_LONG[date.getMonth()]}: ${d.xp} XP`, today: last });
      });
    } else {
      const size = period === '90' ? 7 : 30;
      for (let i = a.days.length; i > 0; i -= size) {
        const chunk = a.days.slice(Math.max(0, i - size), i);
        const first = new Date(chunk[0].date);
        bars.unshift({
          value: chunk.reduce((s, d) => s + d.xp, 0),
          label: `${first.getDate()}-${MONTHS_LONG[first.getMonth()]}`,
          title: `${first.getDate()}-${MONTHS_LONG[first.getMonth()]} dan: ${chunk.reduce((s, d) => s + d.xp, 0)} XP`,
          today: i === a.days.length,
        });
      }
      bars.forEach((b, i) => (b.label = i % 2 === 0 || b.today ? (b.today ? 'Bugun' : b.label) : ''));
    }
    const max = Math.max(1, ...bars.map((b) => b.value));
    const avg = Math.round(a.days.reduce((s, d) => s + d.xp, 0) / Math.max(1, a.days.length));
    // Figma: o'rtachadan yuqori kunlar to'q binafsha, qolganlari och.
    return { bars: bars.map((b) => ({ ...b, height: Math.max(2, (b.value / max) * 100), high: b.value > avg })), avg };
  });

  protected readonly xpTitle = computed(() => {
    switch (this.period()) {
      case '7':
        return 'Kunlik XP (7 kun)';
      case '30':
        return 'Kunlik XP (30 kun)';
      case '90':
        return 'Haftalik XP (3 oy)';
      default:
        return 'Oylik XP (1 yil)';
    }
  });

  /** So'zlar holati donut segmentlari (SVG stroke-dasharray). */
  protected readonly donut = computed(() => {
    const s = this.statsValue();
    if (!s) return null;
    const parts = [
      { label: 'Yangi', value: s.words.new, color: 'var(--color-blue)', dot: 'bg-blue' },
      { label: "O'rganilmoqda", value: s.words.learning, color: 'var(--color-yellow)', dot: 'bg-yellow' },
      { label: 'Takrorlash', value: s.words.review, color: 'var(--color-violet)', dot: 'bg-violet' },
      { label: "O'zlashtirildi", value: s.words.mastered, color: 'var(--color-mint)', dot: 'bg-mint' },
    ];
    const total = parts.reduce((sum, p) => sum + p.value, 0);
    const circumference = 2 * Math.PI * 54;
    let offset = 0;
    const segments = parts.map((p) => {
      const length = total ? (p.value / total) * circumference : 0;
      // Segmentlar orasida kichik oraliq (Figma'dagidek).
      const gap = total && p.value && p.value !== total ? 3 : 0;
      const seg = { ...p, dash: `${Math.max(0, length - gap)} ${circumference}`, offset: -offset };
      offset += length;
      return seg;
    });
    return { segments, total };
  });

  protected readonly exercises = computed(() => {
    const acc = this.accuracy.hasValue() ? this.accuracy.value() : null;
    return EXERCISES.map((e) => {
      const item = acc?.byExercise.find((x) => x.exerciseType === e.type);
      const percent = item?.accuracyPercent ?? 0;
      return {
        ...e,
        total: item?.total ?? 0,
        percent,
        color: percent >= 85 ? 'bg-mint' : percent >= 70 ? 'bg-yellow' : 'bg-coral-strong',
      };
    });
  });

  /** Yutuqlar: avval olinganlar, so'ng jarayondagilar — 6 tasi. */
  protected readonly achievementList = computed(() => {
    if (!this.achievements.hasValue()) return null;
    return this.achievements
      .value()
      .items.slice(0, 6)
      .map((a) => ({
        ...a,
        style: ACHIEVEMENT_STYLE[a.conditionType] ?? { icon: 'trophy' as IconName, box: 'bg-blue' },
        percent: a.conditionValue ? Math.min(100, Math.round((a.progress / a.conditionValue) * 100)) : 0,
      }));
  });

  protected activityEmpty(a: ActivityResponse): boolean {
    return a.days.every((d) => d.xp === 0);
  }
}
