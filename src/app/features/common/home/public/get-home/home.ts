import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CefrLevel, ExerciseType, WordStatus } from '../../../../../core/api/enums';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Badge } from '../../../../../shared/ui/badge/badge';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ICONS, IconName } from '../../../../../shared/ui/icon/icons';
import { formatNextReview, formatNumber } from '../../../../../shared/ui/layout/format';
import { ProgressBar } from '../../../../../shared/ui/progress/progress-bar';
import { ProgressRing } from '../../../../../shared/ui/progress/progress-ring';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tab } from '../../../../../shared/ui/tab/tab';
import { Table } from '../../../../../shared/ui/table/table';
import { Tag, TagColor } from '../../../../../shared/ui/tag/tag';
import { HomeService } from './home.service';

const CATEGORY_COLORS = [
  { box: 'bg-blue-soft', icon: 'text-blue-text' },
  { box: 'bg-violet-soft', icon: 'text-violet-text' },
  { box: 'bg-yellow-soft', icon: 'text-yellow-text' },
  { box: 'bg-mint-soft', icon: 'text-mint-text' },
  { box: 'bg-mint-soft', icon: 'text-mint-text' },
  { box: 'bg-coral-soft', icon: 'text-coral-text' },
];

const DECK_COVERS = [
  { bg: 'bg-yellow', letter: 'text-ink' },
  { bg: 'bg-violet', letter: 'text-yellow' },
  { bg: 'bg-mint', letter: 'text-ink' },
  { bg: 'bg-coral', letter: 'text-ink' },
];

const CEFR_LEVELS: CefrLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

/** Figma: 01 — "6 xil mashq" (backend ExerciseType bilan bir xil). */
const EXERCISES: { type: ExerciseType; title: string; text: string; icon: IconName; box: string; iconColor: string }[] = [
  { type: 'flashcard', title: 'Kartochkalar', text: "So'zni ko'ring, eslang va o'zingizni baholang.", icon: 'cards', box: 'bg-yellow-soft', iconColor: 'text-yellow-text' },
  { type: 'multiple_choice', title: 'Test (4 variant)', text: "To'g'ri tarjimani to'rt variant ichidan toping.", icon: 'choice', box: 'bg-violet-soft', iconColor: 'text-violet-text' },
  { type: 'typing', title: 'Yozish', text: "Tarjimani ko'rib, so'zni to'g'ri yozing.", icon: 'keyboard', box: 'bg-blue-soft', iconColor: 'text-blue-text' },
  { type: 'listening', title: 'Tinglash', text: "Talaffuzni eshiting va so'zni aniqlang.", icon: 'headphones', box: 'bg-mint-soft', iconColor: 'text-mint-text' },
  { type: 'fill_blank', title: "Bo'shliqni to'ldirish", text: "Gapdagi bo'sh joyga mos so'zni qo'ying.", icon: 'blank', box: 'bg-coral-soft', iconColor: 'text-coral-text' },
  { type: 'matching', title: 'Juftlash', text: "So'zlarni tarjimalari bilan tezda juftlang.", icon: 'link', box: 'bg-mint-soft', iconColor: 'text-mint-text' },
];

const WEEKDAY_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const MY_WORD_TABS: { status: WordStatus | null; label: string }[] = [
  { status: null, label: 'Hammasi' },
  { status: 'new', label: 'Yangi' },
  { status: 'learning', label: "O'rganilmoqda" },
  { status: 'review', label: 'Takrorlash' },
  { status: 'mastered', label: "O'zlashtirildi" },
];

const POS_TAGS: Partial<Record<string, TagColor>> = {
  noun: 'mint',
  verb: 'violet',
  adjective: 'blue',
  adverb: 'yellow',
};

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Figma: 01 Home (landing).
 * Mehmon: hero (kunning so'zi), mavzular, to'plamlar, mashq turlari, CTA.
 * Tizimga kirgan user uchun qo'shimcha: bugungi statistika, mening so'zlarim, reyting va yutuqlar.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Avatar,
    Badge,
    Button,
    Icon,
    ProgressBar,
    ProgressRing,
    Skeleton,
    EmptyState,
    ErrorState,
    Tab,
    Table,
    Tag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './home.html',
})
export class Home {
  protected readonly canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private readonly service = inject(HomeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly categoryColors = CATEGORY_COLORS;
  protected readonly deckCovers = DECK_COVERS;
  protected readonly cefrLevels = CEFR_LEVELS;
  protected readonly exercises = EXERCISES;
  protected readonly myWordTabs = MY_WORD_TABS;
  protected readonly formatNumber = formatNumber;
  protected readonly formatNextReview = formatNextReview;

  // --- Ochiq ma'lumot ---
  protected readonly word = rxResource({ stream: () => this.service.wordOfTheDay() });
  protected readonly flipped = signal(false);

  protected readonly categories = rxResource({ stream: () => this.service.categories() });

  protected readonly deckLevel = signal<CefrLevel | null>(null);
  protected readonly decks = rxResource({
    params: () => ({ level: this.deckLevel() }),
    stream: ({ params }) => this.service.decks(params.level),
  });

  // --- Faqat tizimga kirgan user ---
  protected readonly stats = rxResource({
    params: () => (this.isAuthenticated() ? true : undefined),
    stream: () => this.service.stats(),
  });
  protected readonly activity = rxResource({
    params: () => (this.isAuthenticated() ? true : undefined),
    stream: () => this.service.activity(7),
  });
  protected readonly myWordsStatus = signal<WordStatus | null>(null);
  protected readonly myWords = rxResource({
    params: () => (this.isAuthenticated() ? { status: this.myWordsStatus() } : undefined),
    stream: ({ params }) => this.service.myWords(params.status),
  });
  protected readonly leaderboard = rxResource({
    params: () => (this.isAuthenticated() ? true : undefined),
    stream: () => this.service.leaderboard(),
  });
  protected readonly achievements = rxResource({
    params: () => (this.isAuthenticated() ? true : undefined),
    stream: () => this.service.achievements(),
  });

  protected readonly goalLeft = computed(() => {
    const s = (this.stats.hasValue() ? this.stats.value() : undefined);
    return s ? Math.max(0, s.today.dailyGoal - s.today.newWords) : 0;
  });

  protected readonly levelProgress = computed(() => {
    const s = (this.stats.hasValue() ? this.stats.value() : undefined);
    if (!s) return { value: 0, max: 1, left: 0 };
    return {
      value: s.xp - s.levelStartXp,
      max: Math.max(1, s.nextLevelXp - s.levelStartXp),
      left: Math.max(0, s.nextLevelXp - s.xp),
    };
  });

  /** Joriy hafta (Du–Ya): faol kunlar, bugun va kelajak. */
  protected readonly week = computed(() => {
    const days = (this.activity.hasValue() ? this.activity.value() : undefined)?.days ?? [];
    const active = new Set(days.filter((d) => d.xp > 0 || d.reviews > 0 || d.newWords > 0).map((d) => d.date));
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const todayIso = localIsoDate(today);
    return WEEKDAY_SHORT.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = localIsoDate(d);
      return {
        label,
        done: active.has(iso),
        today: iso === todayIso,
        future: iso > todayIso,
      };
    });
  });

  protected readonly myWordCounts = computed(() => {
    const w = (this.stats.hasValue() ? this.stats.value() : undefined)?.words;
    return {
      all: w?.total ?? null,
      new: w?.new ?? null,
      learning: w?.learning ?? null,
      review: w?.review ?? null,
      mastered: w?.mastered ?? null,
    };
  });

  protected readonly nextAchievement = computed(() =>
    (this.achievements.hasValue() ? this.achievements.value() : undefined)?.items.find((a) => !a.isEarned) ?? null,
  );

  protected categoryIcon(icon: string | null): IconName {
    return icon && icon in ICONS ? (icon as IconName) : 'grid';
  }

  protected posColor(pos: string | null): TagColor {
    return (pos && POS_TAGS[pos]) || 'gray';
  }

  protected countFor(status: WordStatus | null): number | null {
    const c = this.myWordCounts();
    return status === null ? c.all : c[status];
  }

  /** Audio fayl bo'lmasa brauzer nutq sintezi bilan o'qiladi. */
  protected playAudio(url: string | null, event: Event, text?: string): void {
    event.stopPropagation();
    if (url) {
      void new Audio(url).play().catch(() => undefined);
    } else if (text && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }

  protected searchMyWords(event: Event): void {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).elements.namedItem('q') as HTMLInputElement | null;
    const q = input?.value.trim();
    void this.router.navigate(['/my-words'], { queryParams: q ? { search: q } : {} });
  }
}
