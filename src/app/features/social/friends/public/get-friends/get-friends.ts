import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { FriendRequest, GetFriendsService, LeaderboardEntry, LeaderboardScope } from './get-friends.service';

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: 'friends', label: "Do'stlar" },
  { id: 'global', label: 'Global' },
  { id: 'city', label: 'Shahar' },
];

/** "Asia/Tashkent" → "Toshkent" (ma'lum shaharlar o'zbekcha). */
const CITY: Record<string, string> = {
  'Asia/Tashkent': 'Toshkent',
  'Asia/Samarkand': 'Samarqand',
  'Europe/Moscow': 'Moskva',
  'Europe/Istanbul': 'Istanbul',
  'Europe/London': 'London',
  'Europe/Berlin': 'Berlin',
};

/**
 * Figma: 15 Do'stlar va reyting — haftalik podium (top-3), to'liq reyting (do'stlar / global / shahar),
 * do'st qo'shish (username, havola, Telegram), kelgan so'rovlar, tavsiyalar.
 */
@Component({
  selector: 'app-get-friends',
  imports: [Avatar, Button, Icon, Skeleton, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './get-friends.html',
})
export class GetFriends {
  private readonly service = inject(GetFriendsService);
  private readonly shell = inject(AppShellService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly scopes = SCOPES;
  protected readonly formatNumber = formatNumber;

  protected readonly scope = signal<LeaderboardScope>('friends');
  protected readonly username = signal('');
  protected readonly sending = signal(false);
  protected readonly busyRequest = signal<number | null>(null);
  protected readonly sentTo = signal<Set<string>>(new Set());

  protected readonly board = rxResource({
    params: () => ({ scope: this.scope() }),
    stream: ({ params }) => this.service.leaderboard(params.scope),
  });
  /** Podium va sarlavha uchun har doim haftalik do'stlar reytingi. */
  protected readonly friendsBoard = rxResource({ stream: () => this.service.leaderboard('friends') });
  protected readonly myRank = rxResource({ stream: () => this.service.myRank('friends') });
  protected readonly friendsCount = rxResource({ stream: () => this.service.friendsCount() });
  protected readonly requests = rxResource({ stream: () => this.service.incomingRequests() });
  protected readonly suggestions = rxResource({ stream: () => this.service.suggestions() });

  /** Podium: [2-o'rin, 1-o'rin, 3-o'rin] tartibida (Figma). */
  protected readonly podium = computed(() => {
    const list = this.friendsBoard.hasValue() ? this.friendsBoard.value() : [];
    const [first, second, third] = list;
    return [
      { entry: second ?? null, place: 2, height: 'h-24', box: 'bg-line', avatar: 60 },
      { entry: first ?? null, place: 1, height: 'h-32', box: 'bg-yellow', avatar: 72 },
      { entry: third ?? null, place: 3, height: 'h-18', box: 'bg-coral', avatar: 60 },
    ];
  });

  /** To'liq reyting: podiumdagi uchtadan keyingilar (do'stlar tabida), boshqa tablarda hammasi. */
  protected readonly rows = computed(() => {
    const list = this.board.hasValue() ? this.board.value() : [];
    // Do'stlar ko'p bo'lsa podiumdagi uchtasi takrorlanmaydi; kam bo'lsa jadval bo'sh qolmasin.
    return this.scope() === 'friends' && list.length > 3 ? list.slice(3) : list;
  });

  /** Hafta tugashiga qolgan vaqt (keyingi dushanba 00:00 gacha). */
  protected readonly timeLeft = computed(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + (((8 - next.getDay()) % 7) || 7));
    const hours = Math.floor((next.getTime() - now.getTime()) / 3_600_000);
    return `${Math.floor(hours / 24)} kun ${hours % 24} soat`;
  });

  constructor() {
    effect(() => {
      const count = this.friendsCount.hasValue() ? this.friendsCount.value() : null;
      const rank = this.myRank.hasValue() ? this.myRank.value().rank : null;
      const parts = [count !== null ? `${count} ta do'st` : null, rank ? `Shu hafta ${rank}-o'rindasiz` : null].filter(Boolean);
      untracked(() => this.shell.setPageHeader("Do'stlar", parts.join(' · ') || null));
    });
  }

  protected name(e: { displayName: string | null; username: string; isMe?: boolean }): string {
    return e.isMe ? 'Siz' : e.displayName || e.username;
  }

  protected trend(e: LeaderboardEntry): 'up' | 'down' | 'same' | null {
    if (e.previousRank === null) return null;
    return e.rank < e.previousRank ? 'up' : e.rank > e.previousRank ? 'down' : 'same';
  }

  protected city(r: FriendRequest): string {
    if (r.mutualFriendsCount) return `${r.mutualFriendsCount} umumiy do'st`;
    return (r.timezone && CITY[r.timezone]) || `Daraja ${r.level}`;
  }

  protected onUsername(event: Event): void {
    this.username.set((event.target as HTMLInputElement).value);
  }

  protected sendRequest(raw = this.username()): void {
    const username = raw.trim().replace(/^@/, '');
    if (!username || this.sending()) return;
    this.sending.set(true);
    this.service.send(username).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.username.set('');
        this.sentTo.update((s) => new Set(s).add(username.toLowerCase()));
        this.toast.success(res.status === 'accepted' ? `@${res.username} bilan do'st bo'ldingiz!` : `@${res.username} ga so'rov yuborildi`);
        if (res.status === 'accepted') this.reloadSocial();
        this.suggestions.reload();
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.toast.error(problemMessage(err));
      },
    });
  }

  protected respond(r: FriendRequest, accept: boolean): void {
    this.busyRequest.set(r.id);
    (accept ? this.service.accept(r.id) : this.service.reject(r.id)).subscribe({
      next: () => {
        this.busyRequest.set(null);
        this.toast.success(accept ? `${r.displayName || r.username} do'stlaringizga qo'shildi` : "So'rov rad etildi");
        this.requests.reload();
        if (accept) this.reloadSocial();
      },
      error: (err: unknown) => {
        this.busyRequest.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }

  private inviteLink(): string {
    return `${location.origin}/register?ref=${encodeURIComponent(this.auth.username() ?? '')}`;
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteLink());
      this.toast.success('Taklif havolasi nusxalandi');
    } catch {
      this.toast.error("Havolani nusxalab bo'lmadi");
    }
  }

  protected telegramLink(): string {
    const text = "So'zchi'da birga so'z o'rganamiz! Qo'shil:";
    return `https://t.me/share/url?url=${encodeURIComponent(this.inviteLink())}&text=${encodeURIComponent(text)}`;
  }

  private reloadSocial(): void {
    this.board.reload();
    this.friendsBoard.reload();
    this.friendsCount.reload();
    this.myRank.reload();
  }
}
