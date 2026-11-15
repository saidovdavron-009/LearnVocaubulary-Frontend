import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { apiUrl } from '../../../core/api/api-url';
import { AuthService } from '../../../core/auth/auth.service';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/http-context';
import { ShellProfile } from '../../../core/layout/app-shell.models';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { IconName } from '../../../shared/ui/icon/icons';
import { formatNumber } from '../../../shared/ui/layout/format';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../shared/ui/state/error-state';
import { AdminReportsTable } from '../reports/admin-reports-table';
import { AdminUsersTable } from '../users/admin-users-table';

/** Swagger: GET /api/admin/users/overview → GetOverviewResponse */
interface Overview {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  newUsersLast7Days: number;
  activeUsersToday: number;
  totalWords: number;
  newWordsLast30Days: number;
  totalDecks: number;
  totalReviews: number;
  reviewsToday: number;
  openReports: number;
  staleOpenReports: number;
  editors: number;
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** Figma: 18 Admin panel — Umumiy ko'rinish. */
@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink, Avatar, Button, Icon, Skeleton, ErrorState, AdminUsersTable, AdminReportsTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="font-display text-h1 text-fg">Umumiy ko'rinish</h1>
        <p class="mt-1 text-body-lg text-fg-secondary">Platforma holati · {{ now }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <a appButton routerLink="/admin/reports" variant="secondary" icon="chart">Hisobot</a>
        <a appButton routerLink="/admin/words" [queryParams]="{ new: 1 }" icon="plus">So'z qo'shish</a>
        @if (profile.hasValue()) {
          <div class="flex items-center gap-2.5 pl-1">
            <app-avatar [name]="profile.value().displayName || profile.value().username" [src]="profile.value().avatarUrl" color="violet" [size]="40" />
            <div class="flex flex-col">
              <span class="text-body-strong text-fg">{{ (profile.value().displayName || profile.value().username).split(' ')[0] }}</span>
              <span class="text-caption text-fg-muted">{{ profile.value().role }}</span>
            </div>
          </div>
        }
      </div>
    </header>

    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      @if (cards(); as list) {
        @for (c of list; track c.label) {
          <div class="flex flex-col gap-3 rounded-2xl border-2 border-line bg-surface px-5 py-5">
            <div class="flex items-start justify-between">
              <p class="text-body font-semibold text-fg-secondary">{{ c.label }}</p>
              <span class="flex size-10 items-center justify-center rounded-lg" [class]="c.box"><app-icon [name]="c.icon" [size]="20" /></span>
            </div>
            <p class="font-display text-number text-fg">{{ c.value }}</p>
            <p class="text-caption" [class]="c.noteClass">{{ c.note }}</p>
          </div>
        }
      } @else if (overview.error()) {
        <div class="col-span-full rounded-2xl border-2 border-line bg-surface"><app-error-state (retry)="overview.reload()" /></div>
      } @else {
        @for (i of [1, 2, 3, 4]; track i) {
          <app-skeleton class="h-39 rounded-2xl" />
        }
      }
    </div>

    <app-admin-users-table [compact]="true" />
    <app-admin-reports-table [compact]="true" />
  `,
})
export class AdminOverview {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);
  protected readonly auth = inject(AuthService);

  protected readonly now = (() => {
    const d = new Date();
    return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  protected readonly overview = rxResource({
    stream: () => this.http.get<Overview>(apiUrl('/admin/users/overview'), { context: this.quiet }),
  });
  protected readonly profile = rxResource({
    stream: () => this.http.get<ShellProfile>(apiUrl('/profile/me'), { context: this.quiet }),
  });

  protected readonly cards = computed(() => {
    if (!this.overview.hasValue()) return null;
    const o = this.overview.value();
    const dau = o.activeUsers ? Math.round((o.activeUsersToday / o.activeUsers) * 100) : 0;
    return [
      { label: 'Foydalanuvchilar', value: formatNumber(o.totalUsers), note: `+${formatNumber(o.newUsersLast7Days)} shu hafta`, noteClass: 'text-mint-text', icon: 'users' as IconName, box: 'bg-violet-soft text-violet-text' },
      { label: 'Bugun faol', value: formatNumber(o.activeUsersToday), note: `${dau}% DAU`, noteClass: 'text-mint-text', icon: 'bolt' as IconName, box: 'bg-yellow-soft text-yellow-text' },
      { label: "So'zlar bazasi", value: formatNumber(o.totalWords), note: `+${formatNumber(o.newWordsLast30Days)} shu oy`, noteClass: 'text-mint-text', icon: 'book' as IconName, box: 'bg-mint-soft text-mint-text' },
      {
        label: 'Ochiq shikoyatlar',
        value: formatNumber(o.openReports),
        note: o.staleOpenReports ? `${o.staleOpenReports} tasi 24 soatdan oshgan` : "Hammasi o'z vaqtida",
        noteClass: o.staleOpenReports ? 'text-coral-text' : 'text-mint-text',
        icon: 'flag' as IconName,
        box: 'bg-coral-soft text-coral-text',
      },
    ];
  });
}
