import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icon } from '../../shared/ui/icon/icon';
import { AdminSidebar } from '../../shared/ui/layout/admin-sidebar';
import { NavItem } from '../../shared/ui/layout/nav-item.model';
import { apiUrl } from '../api/api-url';
import { PaginatedResponse } from '../api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context';

/** Admin panel qobig'i: to'q sidebar + kontent (faqat admin roli). */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AdminSidebar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-page' },
  template: `
    <app-admin-sidebar class="fixed inset-y-0 left-0 z-20 hidden lg:flex" [items]="navItems()" />

    @if (menuOpen()) {
      <div class="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menyusi">
        <button
          type="button"
          class="fade-in absolute inset-0 bg-ink/40"
          aria-label="Menyuni yopish"
          (click)="menuOpen.set(false)"
        ></button>
        <app-admin-sidebar
          class="slide-in-left relative h-full max-w-[85vw]"
          [items]="navItems()"
          (navigate)="menuOpen.set(false)"
        />
      </div>
    }

    <div class="flex min-h-dvh flex-col lg:pl-62">
      <div class="flex h-16 items-center px-4 lg:hidden">
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-lg border-2 border-line bg-surface text-fg"
          aria-label="Menyuni ochish"
          (click)="menuOpen.set(true)"
        >
          <app-icon name="grid" [size]="20" />
        </button>
      </div>
      <main id="main" class="flex-1 px-4 pb-8 md:px-8 lg:pt-7">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayout {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  private readonly openReports = signal(0);

  protected readonly navItems = computed<NavItem[]>(() => [
    { label: 'Umumiy', icon: 'grid', link: '/admin' },
    { label: 'Foydalanuvchilar', icon: 'users', link: '/admin/users' },
    { label: "So'zlar", icon: 'book', link: '/admin/words' },
    { label: "To'plamlar", icon: 'layers', link: '/admin/decks' },
    { label: 'Kategoriyalar', icon: 'filter', link: '/admin/categories' },
    { label: 'Shikoyatlar', icon: 'flag', link: '/admin/reports', badge: this.openReports() },
    { label: 'Yutuqlar', icon: 'trophy', link: '/admin/achievements' },
    { label: 'Tillar', icon: 'globe', link: '/admin/languages' },
    { label: 'Sozlamalar', icon: 'settings', link: '/admin/settings' },
  ]);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.loadOpenReports();
      });

    effect(() => {
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  /** Sidebar'dagi "Shikoyatlar" hisoblagichi: GET /api/admin/reports?status=open → totalCount. */
  private loadOpenReports(): void {
    this.http
      .get<PaginatedResponse<unknown>>(apiUrl('/admin/reports'), {
        params: { status: 'open', page: 1, pageSize: 1 },
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({ next: (r) => this.openReports.set(r.totalCount), error: () => undefined });
  }
}
