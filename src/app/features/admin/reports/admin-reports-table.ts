import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { apiUrl } from '../../../core/api/api-url';
import { CefrLevel, ReportStatus } from '../../../core/api/enums';
import { PaginatedResponse } from '../../../core/api/paginated-response.model';
import { problemMessage } from '../../../core/api/problem-details';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/http-context';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatRelative } from '../../../shared/ui/layout/format';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../shared/ui/state/error-state';
import { Tab } from '../../../shared/ui/tab/tab';
import { ToastService } from '../../../shared/ui/toast/toast.service';

/** Swagger: GET /api/admin/reports → GetAllReportsResponse */
interface AdminReport {
  id: number;
  wordId: number;
  wordText: string;
  wordCefrLevel: CefrLevel | null;
  userId: string;
  username: string;
  userDisplayName: string | null;
  message: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUSES: { id: ReportStatus; label: string }[] = [
  { id: 'open', label: 'Ochiq' },
  { id: 'resolved', label: 'Hal qilingan' },
  { id: 'rejected', label: 'Rad etilgan' },
];

/** Figma: 18 Admin — "So'zlar bo'yicha shikoyatlar": holat tablari, hal qilish / rad etish. */
@Component({
  selector: 'app-admin-reports-table',
  imports: [RouterLink, Avatar, Icon, Pagination, Skeleton, ErrorState, Tab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden rounded-2xl border-2 border-line bg-surface' },
  template: `
    <div class="flex flex-col gap-3 px-5 pt-4.5 pb-4 lg:flex-row lg:items-center lg:justify-between">
      <h2 class="flex items-center gap-2.5 font-display text-h3 text-fg">
        So'zlar bo'yicha shikoyatlar
        @if (counts.hasValue() && counts.value()['open']) {
          <span class="rounded-full bg-coral-strong px-2 py-0.5 font-sans text-caption text-fg-inverse">{{ counts.value()['open'] }} ochiq</span>
        }
      </h2>
      <div role="tablist" aria-label="Shikoyatlar holati" class="flex gap-1.5 overflow-x-auto">
        @for (s of statuses; track s.id) {
          <button appTab [active]="status() === s.id" [count]="counts.hasValue() ? counts.value()[s.id] : null" (click)="setStatus(s.id)">
            {{ s.label }}
          </button>
        }
      </div>
    </div>

    @if (reports.isLoading() && !reports.hasValue()) {
      <div class="flex flex-col gap-2 px-5 pb-5">
        @for (i of [1, 2, 3]; track i) {
          <app-skeleton class="h-14" />
        }
      </div>
    } @else if (reports.error()) {
      <app-error-state (retry)="reports.reload()" />
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full min-w-245 border-collapse text-left">
          <thead class="bg-muted">
            <tr class="text-label-caps text-fg-secondary uppercase">
              <th class="py-3.5 pr-2 pl-5">So'z</th>
              <th class="px-2 py-3.5">Xabar</th>
              <th class="px-2 py-3.5">Yuborgan</th>
              <th class="px-2 py-3.5">Holat</th>
              <th class="px-2 py-3.5">Sana</th>
              <th class="py-3.5 pr-5 pl-2 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            @for (r of reports.value()?.data ?? []; track r.id) {
              <tr class="border-t border-muted">
                <td class="py-3.5 pr-2 pl-5">
                  <a [routerLink]="['/words', r.wordId]" class="flex items-center gap-2.5 hover:text-violet-text">
                    <span class="text-body-strong text-fg">{{ r.wordText }}</span>
                    @if (r.wordCefrLevel) {
                      <span class="rounded-sm bg-muted px-2.5 py-1.25 text-label text-fg-secondary">{{ r.wordCefrLevel.toUpperCase() }}</span>
                    }
                  </a>
                </td>
                <td class="max-w-84 px-2 py-3.5 text-body text-fg-secondary">{{ r.message }}</td>
                <td class="px-2 py-3.5">
                  <div class="flex items-center gap-2">
                    <app-avatar [name]="r.userDisplayName || r.username" [size]="28" />
                    <span class="truncate text-body font-semibold text-fg">{{ r.userDisplayName || r.username }}</span>
                  </div>
                </td>
                <td class="px-2 py-3.5">
                  @switch (r.status) {
                    @case ('open') {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-yellow-soft px-2.75 py-1.25 text-label text-yellow-text"><span class="size-2 rounded-full bg-yellow"></span>Ochiq</span>
                    }
                    @case ('resolved') {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.75 py-1.25 text-label text-mint-text"><span class="size-2 rounded-full bg-mint"></span>Hal qilindi</span>
                    }
                    @default {
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.75 py-1.25 text-label text-fg-secondary"><span class="size-2 rounded-full bg-fg-muted"></span>Rad etildi</span>
                    }
                  }
                </td>
                <td class="px-2 py-3.5 text-body font-semibold text-fg-secondary">{{ formatRelative(r.createdAt) }}</td>
                <td class="py-3.5 pr-5 pl-2">
                  @if (r.status === 'open') {
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        class="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-soft px-3.5 text-label text-violet-text shadow-hard shadow-violet-soft-deep active:translate-y-0.5 active:shadow-hard-sm disabled:opacity-50"
                        [disabled]="busy() === r.id"
                        (click)="resolve(r, 'resolved')"
                      >
                        Hal qilish <app-icon name="check" [size]="16" />
                      </button>
                      <button
                        type="button"
                        class="flex size-9 items-center justify-center rounded-md bg-muted text-fg-secondary hover:text-fg disabled:opacity-50"
                        aria-label="Rad etish"
                        [disabled]="busy() === r.id"
                        (click)="resolve(r, 'rejected')"
                      >
                        <app-icon name="x" [size]="18" />
                      </button>
                    </div>
                  } @else {
                    <p class="text-right text-caption text-fg-muted">{{ formatRelative(r.resolvedAt) }}</p>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-5 py-10 text-center text-body text-fg-muted">Shikoyatlar yo'q.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (!compact() && reports.hasValue()) {
        <app-pagination
          class="border-t-2 border-line px-5 py-4"
          [page]="reports.value().page"
          [pageSize]="pageSize()"
          [totalCount]="reports.value().totalCount"
          [totalPages]="reports.value().totalPages"
          (pageChange)="page.set($event)"
          (pageSizeChange)="pageSize.set($event); page.set(1)"
        />
      }
    }
  `,
})
export class AdminReportsTable {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  readonly compact = input(false);

  protected readonly statuses = STATUSES;
  protected readonly formatRelative = formatRelative;
  protected readonly status = signal<ReportStatus>('open');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly busy = signal<number | null>(null);

  protected readonly reports = rxResource({
    params: () => ({ status: this.status(), page: this.page(), pageSize: this.compact() ? 4 : this.pageSize() }),
    stream: ({ params }) =>
      this.http.get<PaginatedResponse<AdminReport>>(apiUrl('/admin/reports'), { params, context: this.quiet }),
  });

  protected readonly counts = rxResource({
    stream: () =>
      forkJoin(
        Object.fromEntries(
          STATUSES.map((s) => [
            s.id,
            this.http
              .get<PaginatedResponse<unknown>>(apiUrl('/admin/reports'), {
                params: { status: s.id, page: 1, pageSize: 1 },
                context: this.quiet,
              })
              .pipe(map((r) => r.totalCount)),
          ]),
        ),
      ),
  });

  protected setStatus(s: ReportStatus): void {
    this.status.set(s);
    this.page.set(1);
  }

  protected resolve(r: AdminReport, status: 'resolved' | 'rejected'): void {
    this.busy.set(r.id);
    this.http.put(apiUrl(`/admin/reports/${r.id}/resolve`), { id: r.id, status }).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success(status === 'resolved' ? 'Shikoyat hal qilindi' : 'Shikoyat rad etildi');
        this.reports.reload();
        this.counts.reload();
      },
      error: (err: unknown) => {
        this.busy.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }
}
