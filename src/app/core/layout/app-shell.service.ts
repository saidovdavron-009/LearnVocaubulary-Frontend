import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { apiUrl } from '../api/api-url';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context';
import { ShellProfile, ShellStats, ShellUnreadCount } from './app-shell.models';

/**
 * Ilova qobig'i (Sidebar + Topbar) uchun ma'lumot: profil, seriya/XP va
 * o'qilmagan bildirishnomalar soni. Sahifalar ma'lumot o'zgarganda refresh*() chaqiradi.
 */
@Injectable({ providedIn: 'root' })
export class AppShellService {
  private readonly http = inject(HttpClient);
  // Qobiq ma'lumoti yuklanmasa sahifa ishlashda davom etadi — toast shart emas.
  private readonly quiet = { context: new HttpContext().set(SKIP_ERROR_TOAST, true) };

  readonly profile = signal<ShellProfile | null>(null);
  readonly stats = signal<ShellStats | null>(null);
  readonly unreadCount = signal(0);
  /**
   * Topbar sarlavhasi. Sahifa o'rnatsa (masalan "Sozlamalar"), salomlashish o'rniga ko'rinadi.
   * Har navigatsiya boshida AppLayout uni tozalaydi.
   */
  readonly pageHeader = signal<{ title: string; subtitle?: string | null } | null>(null);

  setPageHeader(title: string, subtitle?: string | null): void {
    this.pageHeader.set({ title, subtitle });
  }

  loadAll(): void {
    this.refreshProfile();
    this.refreshStats();
    this.refreshUnreadCount();
  }

  refreshProfile(): void {
    this.http
      .get<ShellProfile>(apiUrl('/profile/me'), this.quiet)
      .pipe(catchError(() => of(null)))
      .subscribe((p) => p && this.profile.set(p));
  }

  refreshStats(): void {
    this.http
      .get<ShellStats>(apiUrl('/stats/me'), this.quiet)
      .pipe(catchError(() => of(null)))
      .subscribe((s) => s && this.stats.set(s));
  }

  refreshUnreadCount(): void {
    this.http
      .get<ShellUnreadCount>(apiUrl('/notifications/unread-count'), this.quiet)
      .pipe(catchError(() => of(null)))
      .subscribe((r) => r && this.unreadCount.set(r.count));
  }

  clear(): void {
    this.profile.set(null);
    this.stats.set(null);
    this.unreadCount.set(0);
  }
}
