import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button, ButtonVariant } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { DuelGame, DuelInvite, GameFriend, GamesService, GameStats, GameType } from '../../../games.service';

/** Karusel slaydlari almashish oralig'i. */
const SLIDE_MS = 10_000;

interface GameAction {
  label: string;
  icon?: IconName;
  variant: ButtonVariant;
  /** Havola bo'lsa — sahifaga o'tadi, friends bo'lsa — do'st tanlash oynasi ochiladi. */
  link?: string;
  query?: Record<string, string>;
  friends?: DuelGame;
}

interface GameInfo {
  id: string;
  title: string;
  badge: string;
  /** Onlayn o'yin — banner nishonida yashil "jonli" nuqta. */
  online: boolean;
  text: string;
  icon: IconName;
  stats: GameType;
  /** Banner foni (oq matn o'qiladigan to'q rang). */
  hero: string;
  /** Pastdagi kartochka va ikonka ranglari. */
  card: string;
  iconBox: string;
  tags: string[];
  actions: GameAction[];
}

const GAMES: GameInfo[] = [
  {
    id: 'quiz-duel',
    title: "So'z dueli",
    badge: 'Onlayn · 1v1',
    online: true,
    text: "Raqib bilan bir xil 10 ta savol. Kim tezroq va to'g'riroq topsa — g'olib! To'g'ri javob 100 ball, tezlik uchun +50 gacha bonus.",
    icon: 'bolt',
    stats: 'duel',
    hero: 'bg-ink',
    card: 'bg-violet-soft',
    iconBox: 'bg-violet text-fg-inverse',
    tags: ['1v1', 'Onlayn', '10 savol'],
    actions: [
      { label: 'Raqib topish', icon: 'search', variant: 'yellow', link: '/games/duel', query: { mode: 'random', game: 'quiz' } },
      { label: "Do'stni chaqirish", icon: 'users', variant: 'primary', friends: 'quiz' },
      { label: 'Bot bilan', icon: 'play', variant: 'secondary', link: '/games/duel', query: { mode: 'bot', game: 'quiz' } },
    ],
  },
  {
    id: 'pairs-duel',
    title: 'Juftini top · 1v1',
    badge: 'Onlayn · navbatma-navbat',
    online: true,
    text: "Navbat bilan 2 tadan kartochka ochasiz. Juft topsangiz yana o'ynaysiz, xato qilsangiz navbat raqibga o'tadi. Ko'p juft topgan g'olib!",
    icon: 'users',
    stats: 'pairs_duel',
    hero: 'bg-violet-deep',
    card: 'bg-mint-soft',
    iconBox: 'bg-mint text-fg-inverse',
    tags: ['1v1', 'Onlayn', 'Xotira'],
    actions: [
      { label: "Do'st bilan", icon: 'send', variant: 'yellow', friends: 'pairs' },
      { label: 'Onlayn raqib', icon: 'search', variant: 'primary', link: '/games/duel', query: { mode: 'random', game: 'pairs' } },
      { label: 'Bot bilan', icon: 'play', variant: 'secondary', link: '/games/duel', query: { mode: 'bot', game: 'pairs' } },
    ],
  },
  {
    id: 'speed-round',
    title: 'Tezkor raund',
    badge: 'Yakka · 60 soniya',
    online: false,
    text: "60 soniyada iloji boricha ko'p so'zning tarjimasini toping. Ketma-ket to'g'ri javoblar — kombo bonus, xato — 2 soniya jarima.",
    icon: 'clock',
    stats: 'speed_round',
    hero: 'bg-coral-text',
    card: 'bg-yellow-soft',
    iconBox: 'bg-yellow text-fg',
    tags: ['Yakka', '60 soniya'],
    actions: [{ label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/speed-round' }],
  },
  {
    id: 'match-pairs',
    title: 'Juftini top',
    badge: 'Yakka · xotira',
    online: false,
    text: "Kartochkalarni ochib, inglizcha so'zni o'zbekcha tarjimasi bilan juftlang. Kam urinish va tez tugatish — ko'p ball.",
    icon: 'grid',
    stats: 'match_pairs',
    hero: 'bg-blue-text',
    card: 'bg-blue-soft',
    iconBox: 'bg-blue text-fg-inverse',
    tags: ['Yakka', 'Xotira'],
    actions: [{ label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/match-pairs' }],
  },
  {
    id: 'crossword',
    title: 'Krossvord',
    badge: "Yakka · so'z yozish",
    online: false,
    text: "O'zbekcha tarjimaga qarab inglizcha so'zni katakchalarga yozing. So'zlar bir-birini kesib o'tadi — bitta topilgan so'z boshqasiga yordam beradi.",
    icon: 'edit',
    stats: 'crossword',
    hero: 'bg-mint-text',
    card: 'bg-coral-soft',
    iconBox: 'bg-coral-strong text-fg-inverse',
    tags: ['Yakka', 'Imlo'],
    actions: [{ label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/crossword' }],
  },  {
    id: 'listen-choose',
    title: 'Eshit va tanla',
    badge: 'Yakka / 1v1 · tinglash',
    online: true,
    text: "So'z faqat ovozda aytiladi — to'g'ri o'zbekcha tarjimani tanlang. Yakka yoki raqib bilan 1v1 o'ynang.",
    icon: 'headphones',
    stats: 'listen_choose',
    hero: 'bg-mint-text',
    card: 'bg-mint-soft',
    iconBox: 'bg-mint text-fg-inverse',
    tags: ['Yakka', '1v1', 'Tinglash'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/listen-choose' },
      { label: 'Onlayn raqib', icon: 'search', variant: 'primary', link: '/games/duel', query: { mode: 'random', game: 'listen' } },
      { label: "Do'st bilan", icon: 'send', variant: 'secondary', friends: 'listen' },
    ],
  },
  {
    id: 'scramble',
    title: 'Harflarni tartibla',
    badge: "Yakka · so'z tuzish",
    online: false,
    text: "Aralashib ketgan harflardan inglizcha so'zni tuzing: L P P A E → APPLE. Tarjimasi maslahat sifatida beriladi.",
    icon: 'refresh',
    stats: 'scramble',
    hero: 'bg-coral-text',
    card: 'bg-coral-soft',
    iconBox: 'bg-coral-strong text-fg-inverse',
    tags: ['Yakka', 'Imlo'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/scramble' },
    ],
  },
  {
    id: 'word-search',
    title: "So'z qidirish",
    badge: "Yakka · harflar to'ri",
    online: false,
    text: "Harflar to'ri ichiga yashirilgan so'zlarni toping. Yon tomonda faqat o'zbekcha tarjimalari turadi.",
    icon: 'search',
    stats: 'word_search',
    hero: 'bg-blue-text',
    card: 'bg-blue-soft',
    iconBox: 'bg-blue text-fg-inverse',
    tags: ['Yakka', 'Diqqat'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/word-search' },
    ],
  },
  {
    id: 'dictation',
    title: 'Eshit va yoz',
    badge: 'Yakka · diktant',
    online: false,
    text: "Sayt so'zni ovozda o'qiydi — siz uni inglizcha yozasiz. Quloq va imlo uchun eng yaxshi mashq.",
    icon: 'speaker',
    stats: 'dictation',
    hero: 'bg-violet-deep',
    card: 'bg-violet-soft',
    iconBox: 'bg-violet text-fg-inverse',
    tags: ['Yakka', 'Tinglash', 'Imlo'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/dictation' },
    ],
  },
  {
    id: 'true-false',
    title: "To'g'ri yoki noto'g'ri",
    badge: 'Yakka · 60 soniya',
    online: false,
    text: "apple = olma ✅ / dog = mushuk ❌. Tez-tez bosing — ketma-ket to'g'ri javoblar kombo beradi!",
    icon: 'bolt',
    stats: 'true_false',
    hero: 'bg-yellow-text',
    card: 'bg-yellow-soft',
    iconBox: 'bg-yellow text-fg',
    tags: ['Yakka', 'Tezlik'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/true-false' },
    ],
  },
  {
    id: 'falling-words',
    title: "Tushayotgan so'zlar",
    badge: 'Yakka · reaksiya',
    online: false,
    text: "Tepadan o'zbekcha so'zlar tushib keladi — yerga yetguncha inglizchasini yozing. 3 ta jon, borgan sari tezlashadi!",
    icon: 'arrow-right',
    stats: 'falling_words',
    hero: 'bg-ink',
    card: 'bg-blue-soft',
    iconBox: 'bg-blue text-fg-inverse',
    tags: ['Yakka', 'Tezlik', 'Imlo'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/falling-words' },
    ],
  },
  {
    id: 'balloon-pop',
    title: 'Shar otish',
    badge: 'Yakka · reaksiya',
    online: false,
    text: "O'zbekcha so'z ko'rsatiladi — uchib ketayotgan sharlar orasidan to'g'ri inglizcha so'zni bosing!",
    icon: 'target',
    stats: 'balloon_pop',
    hero: 'bg-coral-text',
    card: 'bg-coral-soft',
    iconBox: 'bg-coral text-fg-inverse',
    tags: ['Yakka', 'Tezlik'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/balloon-pop' },
    ],
  },
  {
    id: 'categories',
    title: 'Toifaga ajrat',
    badge: 'Yakka · mantiq',
    online: false,
    text: "So'zlarni qutilarga joylang: 🍎 meva, 🐶 hayvon, 👕 kiyim va boshqalar. Bosib yoki sudrab tashlang.",
    icon: 'layers',
    stats: 'categories',
    hero: 'bg-mint-text',
    card: 'bg-mint-soft',
    iconBox: 'bg-mint text-fg-inverse',
    tags: ['Yakka', 'Mantiq'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/categories' },
    ],
  },
  {
    id: 'word-chain',
    title: "So'z zanjiri",
    badge: 'Botga qarshi',
    online: false,
    text: "Oldingi so'zning oxirgi harfi bilan yangi so'z ayting: apple → egg → green... Botni yengib ko'ring!",
    icon: 'link',
    stats: 'word_chain',
    hero: 'bg-violet-deep',
    card: 'bg-violet-soft',
    iconBox: 'bg-violet text-fg-inverse',
    tags: ['Bot bilan', "So'z boyligi"],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/word-chain' },
    ],
  },
  {
    id: 'picture-match',
    title: "Rasm va so'z",
    badge: "Yakka · boshlang'ich",
    online: false,
    text: "Rasm ko'rsatiladi — uning inglizcha nomini tanlang. Boshlang'ich daraja uchun juda samarali.",
    icon: 'eye',
    stats: 'picture_match',
    hero: 'bg-blue-text',
    card: 'bg-yellow-soft',
    iconBox: 'bg-yellow text-fg',
    tags: ['Yakka', 'Rasm'],
    actions: [
      { label: "O'ynash", icon: 'play', variant: 'yellow', link: '/games/picture-match' },
    ],
  },
];

/**
 * O'yinlar bo'limi: tepada har 10 soniyada almashadigan banner (karusel), pastda barcha o'yinlar kartochkalari.
 * Banner sichqoncha ustida yoki ichida fokus bo'lganda to'xtaydi.
 */
@Component({
  selector: 'app-get-games',
  imports: [Avatar, Button, Icon, Modal, RouterLink, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './get-games.html',
})
export class GetGames {
  private readonly service = inject(GamesService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly games = GAMES;
  protected readonly formatNumber = formatNumber;

  protected readonly summary = rxResource({ stream: () => this.service.summary() });
  protected readonly invites = signal<DuelInvite[]>([]);
  protected readonly busyInvite = signal<string | null>(null);

  // ---------- Karusel ----------
  protected readonly slide = signal(0);
  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);

  // ---------- Do'stni chaqirish ----------
  protected readonly friendsOpen = signal(false);
  protected readonly friendGame = signal<DuelGame>('quiz');
  protected readonly friends = rxResource({
    params: () => (this.friendsOpen() ? true : undefined),
    stream: () => this.service.friends(),
  });
  protected readonly friendSearch = signal('');
  protected readonly invitingFriend = signal<string | null>(null);
  protected readonly filteredFriends = computed(() => {
    const list = this.friends.hasValue() ? this.friends.value() : [];
    const q = this.friendSearch().trim().toLowerCase();
    return q ? list.filter((f) => (f.displayName ?? '').toLowerCase().includes(q) || f.username.toLowerCase().includes(q)) : list;
  });

  protected readonly paused = computed(() => this.hovered() || this.focused() || this.friendsOpen());

  protected readonly dailyXp = computed(() => {
    const s = this.summary.hasValue() ? this.summary.value() : null;
    return s ? { today: s.xpToday, cap: s.dailyXpCap, pct: Math.min(100, (s.xpToday / s.dailyXpCap) * 100) } : null;
  });

  constructor() {
    inject(AppShellService).setPageHeader("O'yinlar", "Bellashing, rekord o'rnating va XP yig'ing");

    // Banner: har 10 soniyada keyingi o'yin (to'xtatilgan bo'lsa — kutadi).
    const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      interval(SLIDE_MS)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (!this.paused()) this.slide.update((i) => (i + 1) % GAMES.length);
        });
    }

    // Kelgan duel chaqiruvlari — sahifa ochiq turganda har 4 soniyada.
    interval(4000)
      .pipe(
        startWith(0),
        switchMap(() => this.service.incomingInvites().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => list && this.invites.set(list));
  }

  protected goTo(i: number): void {
    this.slide.set((i + GAMES.length) % GAMES.length);
  }

  protected stats(type: GameType): GameStats | null {
    const s = this.summary.hasValue() ? this.summary.value() : null;
    return s?.games.find((g) => g.gameType === type) ?? null;
  }

  /** Kartochkadagi qisqa statistika. */
  protected statLine(game: GameInfo): string {
    const s = this.stats(game.stats);
    if (!s?.played) return "Hali o'ynalmagan";
    if (game.online) return `${s.wins} g'alaba · ${s.losses} mag'lubiyat · ${s.draws} durang`;
    return `Rekord: ${formatNumber(s.bestScore)} · ${s.played} marta`;
  }

  protected secondsLeft(invite: DuelInvite): number {
    return Math.max(0, Math.round((new Date(invite.expiresAt).getTime() - Date.now()) / 1000));
  }

  protected gameName(game: DuelGame): string {
    if (game === 'pairs') return '"Juftini top" o‘yiniga';
    if (game === 'listen') return '"Eshit va tanla" o‘yiniga';
    return 'So‘z dueliga';
  }

  protected accept(invite: DuelInvite): void {
    this.busyInvite.set(invite.id);
    this.service.acceptInvite(invite.id).subscribe({
      next: (r) => {
        this.busyInvite.set(null);
        if (r.duelId) void this.router.navigate(['/games/duel', r.duelId]);
      },
      error: (err: unknown) => {
        this.busyInvite.set(null);
        this.invites.update((list) => list.filter((x) => x.id !== invite.id));
        this.toast.error(problemMessage(err));
      },
    });
  }

  protected decline(invite: DuelInvite): void {
    this.invites.update((list) => list.filter((x) => x.id !== invite.id));
    this.service.declineInvite(invite.id).subscribe({ error: () => undefined });
  }

  protected openFriends(game: DuelGame): void {
    this.friendGame.set(game);
    this.friendSearch.set('');
    this.friendsOpen.set(true);
  }

  protected inviteFriend(friend: GameFriend): void {
    this.invitingFriend.set(friend.userId);
    this.service.invite(friend.userId, this.friendGame()).subscribe({
      next: (invite) => {
        this.invitingFriend.set(null);
        this.friendsOpen.set(false);
        void this.router.navigate(['/games/duel'], { queryParams: { invite: invite.id, game: invite.game } });
      },
      error: () => this.invitingFriend.set(null),
    });
  }

  protected friendName(f: GameFriend): string {
    return f.displayName || f.username;
  }

  protected onFriendSearch(event: Event): void {
    this.friendSearch.set((event.target as HTMLInputElement).value);
  }

  /** Fokus banner ichidan butunlay chiqib ketgandagina karusel davom etadi. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) this.focused.set(false);
  }
}
