import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NotificationType } from '../../../../../core/api/enums';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tab } from '../../../../../shared/ui/tab/tab';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { GetNotificationsService, NotificationItem, PendingRequest } from './get-notifications.service';

type Filter = 'all' | 'unread' | 'review_due' | 'friend_request' | 'achievement';

const FILTERS: { id: Filter; label: string; count: boolean }[] = [
  { id: 'all', label: 'Hammasi', count: true },
  { id: 'unread', label: "O'qilmagan", count: true },
  { id: 'review_due', label: 'Takrorlash', count: false },
  { id: 'friend_request', label: "Do'stlar", count: false },
  { id: 'achievement', label: 'Yutuqlar', count: false },
];

const TYPE_STYLE: Record<NotificationType, { icon: IconName; box: string }> = {
  review_due: { icon: 'clock', box: 'bg-violet-soft text-violet-text' },
  streak_reminder: { icon: 'flame', box: 'bg-coral-soft text-coral-strong' },
  friend_request: { icon: 'users', box: 'bg-blue-soft text-blue-text' },
  achievement: { icon: 'trophy', box: 'bg-yellow-soft text-yellow-text' },
  system: { icon: 'bell', box: 'bg-muted text-fg-secondary' },
};

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const PAGE_SIZE = 30;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Figma: 16 Bildirishnomalar — filtr tablari, kunlar bo'yicha guruhlar, amallar (boshlash, qabul/rad). */
@Component({
  selector: 'app-get-notifications',
  imports: [RouterLink, Button, Icon, Skeleton, EmptyState, ErrorState, Tab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './get-notifications.html',
})
export class GetNotifications {
  private readonly service = inject(GetNotificationsService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);

  protected readonly filters = FILTERS;
  protected readonly typeStyle = TYPE_STYLE;

  protected readonly filter = signal<Filter>('all');
  protected readonly limit = signal(PAGE_SIZE);
  protected readonly busy = signal<number | null>(null);
  /** Shu sahifada javob berilgan so'rovlar (tugmalar yashiriladi). */
  protected readonly handled = signal<Map<number, 'accepted' | 'rejected'>>(new Map());

  protected readonly list = rxResource({
    params: () => ({ filter: this.filter(), limit: this.limit() }),
    stream: ({ params }) =>
      this.service.getAll({
        unreadOnly: params.filter === 'unread',
        type: params.filter === 'all' || params.filter === 'unread' ? null : params.filter,
        page: 1,
        pageSize: params.limit,
      }),
  });

  protected readonly counts = rxResource({
    stream: () => forkJoin({ all: this.service.count({}), unread: this.service.count({ unreadOnly: true }) }),
  });

  protected readonly requests = rxResource({ stream: () => this.service.incomingRequests() });

  /** Kunlar bo'yicha guruhlar: Bugun, Kecha, Shu hafta, Oldinroq. */
  protected readonly groups = computed(() => {
    if (!this.list.hasValue()) return [];
    const today = startOfDay(new Date());
    const order = ['Bugun', 'Kecha', 'Shu hafta', 'Oldinroq'];
    const map = new Map<string, NotificationItem[]>();
    for (const n of this.list.value().data) {
      const days = Math.round((today - startOfDay(new Date(n.createdAt))) / 86_400_000);
      const key = days <= 0 ? 'Bugun' : days === 1 ? 'Kecha' : days < 7 ? 'Shu hafta' : 'Oldinroq';
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return order.filter((k) => map.has(k)).map((label) => ({ label, items: map.get(label)! }));
  });

  constructor() {
    effect(() => {
      const unread = this.counts.hasValue() ? this.counts.value().unread : null;
      untracked(() => this.shell.setPageHeader('Bildirishnomalar', unread !== null ? `${unread} ta o'qilmagan` : null));
    });
  }

  protected count(f: Filter): number | null {
    if (!this.counts.hasValue()) return null;
    return f === 'all' ? this.counts.value().all : f === 'unread' ? this.counts.value().unread : null;
  }

  protected setFilter(f: Filter): void {
    this.filter.set(f);
    this.limit.set(PAGE_SIZE);
  }

  /** "10 daqiqa oldin" / "3 soat oldin" / "Kecha, 21:14" / "Dushanba" / "12.10.2026". */
  protected timeAgo(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
    if (minutes < 1) return 'Hozirgina';
    if (days === 0) return minutes < 60 ? `${minutes} daqiqa oldin` : `${Math.floor(minutes / 60)} soat oldin`;
    if (days === 1) return `Kecha, ${time}`;
    if (days < 7) return WEEKDAYS[date.getDay()];
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }

  /** Do'stlik bildirishnomasiga mos kutilayotgan so'rov (matnda ism yoki username bor). */
  protected requestFor(n: NotificationItem): PendingRequest | null {
    if (n.type !== 'friend_request' || !this.requests.hasValue()) return null;
    const text = `${n.title} ${n.body ?? ''}`.toLowerCase();
    return (
      this.requests
        .value()
        .find((r) => text.includes(r.username.toLowerCase()) || (!!r.displayName && text.includes(r.displayName.toLowerCase()))) ?? null
    );
  }

  protected open(n: NotificationItem): void {
    if (n.isRead) return;
    this.service.markRead(n.id).subscribe({
      next: () => {
        n.isRead = true;
        this.list.set({ ...this.list.value()!, data: [...this.list.value()!.data] });
        this.refreshCounts();
      },
    });
  }

  protected markAll(): void {
    this.service.markAllRead().subscribe({
      next: () => {
        this.toast.success("Barchasi o'qilgan qilindi");
        this.list.reload();
        this.refreshCounts();
      },
      error: (err: unknown) => this.toast.error(problemMessage(err)),
    });
  }

  protected remove(n: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.service.remove(n.id).subscribe({
      next: () => {
        this.list.reload();
        this.refreshCounts();
      },
      error: (err: unknown) => this.toast.error(problemMessage(err)),
    });
  }

  protected respond(n: NotificationItem, r: PendingRequest, accept: boolean, event: Event): void {
    event.stopPropagation();
    this.busy.set(r.id);
    this.service.respond(r.id, accept).subscribe({
      next: () => {
        this.busy.set(null);
        this.handled.update((m) => new Map(m).set(r.id, accept ? 'accepted' : 'rejected'));
        this.toast.success(accept ? `${r.displayName || r.username} do'stlaringizga qo'shildi` : "So'rov rad etildi");
        this.open(n);
      },
      error: (err: unknown) => {
        this.busy.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }

  private refreshCounts(): void {
    this.counts.reload();
    this.shell.refreshUnreadCount();
  }
}
