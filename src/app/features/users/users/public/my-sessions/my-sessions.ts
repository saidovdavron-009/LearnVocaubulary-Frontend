import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { apiUrl } from '../../../../../core/api/api-url';
import { problemMessage } from '../../../../../core/api/problem-details';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';

/** Swagger: GET /api/profile/me/sessions → GetMySessionsResponse */
interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/** User-Agent → "Chrome · Windows" va mos ikonka. */
function describe(ua: string | null): { name: string; icon: IconName } {
  if (!ua) return { name: "Noma'lum qurilma", icon: 'globe' };
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Telegram/i.test(ua)
        ? 'Telegram Mini App'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : /Safari\//.test(ua)
              ? 'Safari'
              : ua.split(/[ /]/)[0];
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : null;
  const icon: IconName = browser === 'Telegram Mini App' ? 'send' : /iPhone|Android|iPad/.test(ua) ? 'user' : 'globe';
  return { name: os ? `${browser} · ${os}` : browser, icon };
}

/** "84.54.123.12" → "84.54.•••.12" */
function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.•••.${parts[3]}` : ip;
}

function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 5) return 'Hozir faol';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} soat oldin`;
  return `${Math.floor(minutes / 1440)} kun oldin`;
}

/** Figma: 17 — "Faol seanslar". GET /profile/me/sessions, DELETE /profile/me/sessions/{id}. */
@Component({
  selector: 'app-my-sessions',
  imports: [Icon, Skeleton, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section id="sessions" class="scroll-mt-6 rounded-3xl border-2 border-line bg-surface p-6 md:p-7" aria-labelledby="sessions-title">
      <h2 id="sessions-title" class="font-display text-h3 text-fg">Faol seanslar</h2>
      <p class="mt-1 text-body text-fg-secondary">Hisobingizga kirgan qurilmalar. Notanish qurilmani darhol chiqarib yuboring.</p>

      <div class="mt-5 flex flex-col gap-3">
        @if (sessions.isLoading()) {
          <app-skeleton class="h-17 rounded-card" />
          <app-skeleton class="h-17 rounded-card" />
        } @else if (sessions.error()) {
          <app-error-state (retry)="sessions.reload()" />
        } @else {
          @for (s of sessions.value(); track s.id) {
            @let d = describe(s.userAgent);
            <div class="flex items-center gap-3.5 rounded-card bg-page px-3.5 py-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-fg shadow-hard-sm shadow-line">
                <app-icon [name]="d.icon" [size]="20" />
              </span>
              <div class="flex min-w-0 flex-1 flex-col">
                <p class="flex flex-wrap items-center gap-2 text-body-strong text-fg">
                  {{ d.name }}
                  @if (s.isCurrent) {
                    <span class="rounded-sm bg-mint-soft px-2 py-0.5 text-label text-mint-text">Shu qurilma</span>
                  }
                </p>
                <p class="truncate text-caption text-fg-muted">
                  {{ maskIp(s.ipAddress) ? maskIp(s.ipAddress) + ' · ' : '' }}{{ s.isCurrent ? 'Hozir faol' : ago(s.lastActiveAt) }}
                </p>
              </div>
              @if (!s.isCurrent) {
                <button
                  type="button"
                  class="shrink-0 rounded-md bg-coral-soft px-3 py-2 text-label text-coral-text hover:brightness-95 disabled:opacity-50"
                  [disabled]="busy() === s.id"
                  [attr.aria-label]="d.name + ' seansini yopish'"
                  (click)="revoke(s)"
                >
                  Chiqarish
                </button>
              }
            </div>
          } @empty {
            <p class="text-body text-fg-muted">Faol seans topilmadi.</p>
          }
        }
      </div>
    </section>
  `,
})
export class MySessions {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly describe = describe;
  protected readonly maskIp = maskIp;
  protected readonly ago = ago;
  protected readonly busy = signal<string | null>(null);

  protected readonly sessions = rxResource({
    stream: () =>
      this.http.get<SessionItem[]>(apiUrl('/profile/me/sessions'), { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }),
  });

  protected revoke(s: SessionItem): void {
    this.busy.set(s.id);
    this.http.delete(apiUrl(`/profile/me/sessions/${s.id}`)).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success('Qurilma chiqarib yuborildi');
        this.sessions.reload();
      },
      error: (err: unknown) => {
        this.busy.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }
}
