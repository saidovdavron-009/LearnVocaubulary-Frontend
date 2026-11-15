import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { apiUrl } from '../../../core/api/api-url';
import { UserRole, UserStatus } from '../../../core/api/enums';
import { PaginatedResponse } from '../../../core/api/paginated-response.model';
import { problemMessage } from '../../../core/api/problem-details';
import { AuthService } from '../../../core/auth/auth.service';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/http-context';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatNumber, formatRelative } from '../../../shared/ui/layout/format';
import { Modal } from '../../../shared/ui/modal/modal';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../shared/ui/state/error-state';
import { Tab } from '../../../shared/ui/tab/tab';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

/** Swagger: GET /api/admin/users → GetAllUsersResponse */
interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  wordsCount: number;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

type Filter = 'all' | 'active' | 'blocked' | 'editor';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'active', label: 'Faol' },
  { id: 'blocked', label: 'Bloklangan' },
  { id: 'editor', label: 'Muharrirlar' },
];

const ROLE_STYLE: Record<UserRole, string> = {
  user: 'bg-muted text-fg-secondary',
  editor: 'bg-violet-soft text-violet-text',
  admin: 'bg-coral-soft text-coral-text',
};

function filterParams(f: Filter): Record<string, string> {
  return f === 'active' ? { status: 'active' } : f === 'blocked' ? { status: 'blocked' } : f === 'editor' ? { role: 'editor' } : {};
}

/** Figma: 18 Admin — "Foydalanuvchilar" jadvali: filtr tablari, rol o'zgartirish, bloklash/blokdan chiqarish. */
@Component({
  selector: 'app-admin-users-table',
  imports: [Avatar, Button, Icon, Modal, Pagination, Skeleton, ErrorState, Tab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden rounded-2xl border-2 border-line bg-surface' },
  template: `
    <div class="flex flex-col gap-3 px-5 pt-4.5 pb-4 lg:flex-row lg:items-center lg:justify-between">
      <h2 class="font-display text-h3 text-fg">Foydalanuvchilar</h2>
      <div class="flex flex-wrap items-center gap-2">
        @if (!compact()) {
          <label class="flex h-10 items-center gap-2 rounded-lg border-2 border-line bg-page px-3 focus-within:border-violet">
            <app-icon name="search" [size]="16" class="text-fg-muted" />
            <span class="sr-only">Qidirish</span>
            <input
              type="search"
              placeholder="Email, username yoki ism"
              class="w-48 bg-transparent text-body font-semibold text-fg outline-none placeholder:text-fg-muted"
              (input)="onSearch($event)"
            />
          </label>
        }
        <div role="tablist" aria-label="Foydalanuvchilar filtri" class="flex gap-1.5 overflow-x-auto">
          @for (f of filters; track f.id) {
            <button appTab [active]="filter() === f.id" [count]="counts.hasValue() ? counts.value()[f.id] : null" (click)="setFilter(f.id)">
              {{ f.label }}
            </button>
          }
        </div>
      </div>
    </div>

    @if (users.isLoading() && !users.hasValue()) {
      <div class="flex flex-col gap-2 px-5 pb-5">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <app-skeleton class="h-12" />
        }
      </div>
    } @else if (users.error()) {
      <app-error-state (retry)="users.reload()" />
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full min-w-245 border-collapse text-left">
          <thead class="bg-muted">
            <tr class="text-label-caps text-fg-secondary uppercase">
              <th class="py-3.5 pr-2 pl-5">Foydalanuvchi</th>
              <th class="px-2 py-3.5">Rol</th>
              <th class="px-2 py-3.5">Holat</th>
              <th class="px-2 py-3.5">Email</th>
              <th class="px-2 py-3.5">So'zlar</th>
              <th class="px-2 py-3.5">Oxirgi kirish</th>
              <th class="py-3.5 pr-5 pl-2"><span class="sr-only">Amallar</span></th>
            </tr>
          </thead>
          <tbody>
            @for (u of users.value()?.data ?? []; track u.id) {
              <tr class="border-t border-muted">
                <td class="py-3 pr-2 pl-5">
                  <div class="flex items-center gap-2.5">
                    <app-avatar [name]="u.displayName || u.username" [src]="u.avatarUrl" [size]="36" />
                    <div class="flex min-w-0 flex-col">
                      <span class="truncate text-body-strong text-fg">{{ u.displayName || u.username }}</span>
                      <span class="truncate text-caption text-fg-muted">{{ u.email }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-2 py-3"><span class="rounded-sm px-2.5 py-1.25 text-label" [class]="roleStyle[u.role]">{{ u.role }}</span></td>
                <td class="px-2 py-3">
                  @if (u.status === 'active') {
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.75 py-1.25 text-label text-mint-text"><span class="size-2 rounded-full bg-mint"></span>Faol</span>
                  } @else if (u.status === 'blocked') {
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-2.75 py-1.25 text-label text-coral-text"><span class="size-2 rounded-full bg-coral-strong"></span>Bloklangan</span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.75 py-1.25 text-label text-fg-muted"><span class="size-2 rounded-full bg-fg-muted"></span>O'chirilgan</span>
                  }
                </td>
                <td class="px-2 py-3">
                  @if (u.isEmailVerified) {
                    <span class="inline-flex items-center gap-1.5 text-caption text-mint-text"><app-icon name="check" [size]="16" /> Tasdiq</span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 text-caption text-yellow-text"><app-icon name="clock" [size]="16" /> Kutilmoqda</span>
                  }
                </td>
                <td class="px-2 py-3 text-body font-semibold text-fg">{{ formatNumber(u.wordsCount) }}</td>
                <td class="px-2 py-3 text-body font-semibold text-fg-secondary">{{ formatRelative(u.lastLoginAt) }}</td>
                <td class="py-3 pr-5 pl-2">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="flex size-8 items-center justify-center rounded-md text-fg-secondary hover:bg-muted hover:text-fg disabled:opacity-40"
                      [attr.aria-label]="(u.displayName || u.username) + ' rolini o‘zgartirish'"
                      [disabled]="isMe(u)"
                      (click)="editRole(u)"
                    >
                      <app-icon name="edit" [size]="18" />
                    </button>
                    @if (u.status === 'blocked') {
                      <button
                        type="button"
                        class="flex size-8 items-center justify-center rounded-md text-fg-secondary hover:bg-muted hover:text-fg disabled:opacity-40"
                        [attr.aria-label]="(u.displayName || u.username) + ' ni blokdan chiqarish'"
                        [disabled]="busy() === u.id"
                        (click)="setBlocked(u, false)"
                      >
                        <app-icon name="refresh" [size]="18" />
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="flex size-8 items-center justify-center rounded-md text-fg-secondary hover:bg-coral-soft hover:text-coral-text disabled:opacity-40"
                        [attr.aria-label]="(u.displayName || u.username) + ' ni bloklash'"
                        [disabled]="busy() === u.id || isMe(u) || u.status !== 'active'"
                        (click)="setBlocked(u, true)"
                      >
                        <app-icon name="lock" [size]="18" />
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-5 py-10 text-center text-body text-fg-muted">Foydalanuvchi topilmadi.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (!compact() && users.hasValue()) {
        <app-pagination
          class="border-t-2 border-line px-5 py-4"
          [page]="users.value().page"
          [pageSize]="pageSize()"
          [totalCount]="users.value().totalCount"
          [totalPages]="users.value().totalPages"
          (pageChange)="page.set($event)"
          (pageSizeChange)="pageSize.set($event); page.set(1)"
        />
      }
    }

    <app-modal [(open)]="roleOpen" title="Rolni o'zgartirish" [description]="roleUser()?.email ?? null" [width]="420">
      <div class="flex flex-col gap-2" role="radiogroup" aria-label="Rol">
        @for (r of roles; track r.id) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="roleValue() === r.id"
            class="flex items-center justify-between rounded-input border-2 px-4 py-3 text-left"
            [class]="roleValue() === r.id ? 'border-violet bg-violet-soft' : 'border-line hover:border-line-strong'"
            (click)="roleValue.set(r.id)"
          >
            <span class="flex flex-col">
              <span class="text-body-strong text-fg">{{ r.id }}</span>
              <span class="text-caption text-fg-muted">{{ r.hint }}</span>
            </span>
            @if (roleValue() === r.id) {
              <app-icon name="check" [size]="18" class="text-violet-text" />
            }
          </button>
        }
      </div>
      <div modal-actions class="contents">
        <button appButton type="button" variant="secondary" (click)="roleOpen.set(false)">Bekor qilish</button>
        <button appButton type="button" icon="check" [loading]="busy() === roleUser()?.id" (click)="saveRole()">Saqlash</button>
      </div>
    </app-modal>
  `,
})
export class AdminUsersTable {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** true — umumiy ko'rinishdagi qisqa variant (5 qator, qidiruv/sahifalashsiz). */
  readonly compact = input(false);

  protected readonly filters = FILTERS;
  protected readonly roleStyle = ROLE_STYLE;
  protected readonly formatNumber = formatNumber;
  protected readonly formatRelative = formatRelative;
  protected readonly roles: { id: UserRole; hint: string }[] = [
    { id: 'user', hint: 'Oddiy foydalanuvchi' },
    { id: 'editor', hint: "So'zlar va to'plamlarni tahrirlaydi" },
    { id: 'admin', hint: "To'liq boshqaruv huquqi" },
  ];

  protected readonly filter = signal<Filter>('all');
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly busy = signal<string | null>(null);
  protected readonly roleOpen = signal(false);
  protected readonly roleUser = signal<AdminUser | null>(null);
  protected readonly roleValue = signal<UserRole>('user');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly users = rxResource({
    params: () => ({
      filter: this.filter(),
      search: this.search(),
      page: this.page(),
      pageSize: this.compact() ? 5 : this.pageSize(),
    }),
    stream: ({ params }) => {
      let p = new HttpParams({ fromObject: filterParams(params.filter) }).set('page', params.page).set('pageSize', params.pageSize);
      if (params.search.trim()) p = p.set('search', params.search.trim());
      return this.http.get<PaginatedResponse<AdminUser>>(apiUrl('/admin/users'), { params: p, context: this.quiet });
    },
  });

  protected readonly counts = rxResource({
    stream: () =>
      forkJoin(
        Object.fromEntries(
          FILTERS.map((f) => [
            f.id,
            this.http
              .get<PaginatedResponse<unknown>>(apiUrl('/admin/users'), {
                params: { ...filterParams(f.id), page: 1, pageSize: 1 },
                context: this.quiet,
              })
              .pipe(map((r) => r.totalCount)),
          ]),
        ),
      ),
  });

  protected readonly myId = computed(() => this.auth.session()?.userId ?? null);

  protected isMe(u: AdminUser): boolean {
    return u.id === this.myId();
  }

  protected setFilter(f: Filter): void {
    this.filter.set(f);
    this.page.set(1);
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.search.set(value);
      this.page.set(1);
    }, 300);
  }

  protected editRole(u: AdminUser): void {
    this.roleUser.set(u);
    this.roleValue.set(u.role);
    this.roleOpen.set(true);
  }

  protected saveRole(): void {
    const u = this.roleUser();
    if (!u) return;
    this.busy.set(u.id);
    this.http.put(apiUrl(`/admin/users/${u.id}/role`), { id: u.id, role: this.roleValue() }).subscribe({
      next: () => {
        this.busy.set(null);
        this.roleOpen.set(false);
        this.toast.success(`${u.displayName || u.username} roli: ${this.roleValue()}`);
        this.reload();
      },
      error: (err: unknown) => {
        this.busy.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }

  protected async setBlocked(u: AdminUser, block: boolean): Promise<void> {
    const ok = await this.confirm.ask({
      title: block ? 'Foydalanuvchini bloklash' : 'Blokdan chiqarish',
      subject: `@${u.username}`,
      message: block ? 'ni bloklaysizmi? Uning barcha seanslari yopiladi.' : 'ni blokdan chiqarasizmi?',
      confirmText: block ? 'Ha, bloklash' : 'Ha, chiqarish',
      tone: block ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.busy.set(u.id);
    this.http.post(apiUrl(`/admin/users/${u.id}/${block ? 'block' : 'unblock'}`), { id: u.id }).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success(block ? 'Foydalanuvchi bloklandi' : 'Foydalanuvchi blokdan chiqarildi');
        this.reload();
      },
      error: (err: unknown) => {
        this.busy.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }

  private reload(): void {
    this.users.reload();
    this.counts.reload();
  }
}
