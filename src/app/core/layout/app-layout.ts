import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter, fromEvent, interval, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppSidebar } from '../../shared/ui/layout/app-sidebar';
import { AppTopbar } from '../../shared/ui/layout/app-topbar';
import { NavItem } from '../../shared/ui/layout/nav-item.model';
import { AuthService } from '../auth/auth.service';
import { AppShellService } from './app-shell.service';

/** Seans holati (va bildirishnomalar) qanchalik tez-tez tekshiriladi. */
const SESSION_CHECK_MS = 30_000;

/** Ilova ichi qobig'i: Sidebar + Topbar (faqat tizimga kirgan user). */
@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, AppSidebar, AppTopbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-page' },
  template: `
    <!-- Desktop: doimiy sidebar -->
    <app-sidebar
      class="fixed inset-y-0 left-0 z-20 hidden lg:flex"
      [items]="navItems()"
      [streakDays]="streak()"
    />

    <!-- Mobil/planshet: chiqib keluvchi menyu -->
    @if (menuOpen()) {
      <div class="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Asosiy menyu">
        <button
          type="button"
          class="fade-in absolute inset-0 bg-ink/40"
          aria-label="Menyuni yopish"
          (click)="menuOpen.set(false)"
        ></button>
        <app-sidebar
          class="slide-in-left relative h-full max-w-[85vw]"
          [items]="navItems()"
          [streakDays]="streak()"
          (navigate)="menuOpen.set(false)"
        />
      </div>
    }

    <div class="flex min-h-dvh flex-col lg:pl-66">
      <app-topbar
        [name]="displayName()"
        [title]="shell.pageHeader()?.title ?? null"
        [subtitle]="shell.pageHeader()?.subtitle ?? null"
        [avatarUrl]="shell.profile()?.avatarUrl ?? null"
        [streak]="streak()"
        [xp]="shell.stats()?.xp ?? null"
        [unreadCount]="shell.unreadCount()"
        (searchSubmit)="onSearch($event)"
        (menuToggle)="menuOpen.set(true)"
      />
      <main id="main" class="flex-1 px-4 pt-2 pb-8 md:px-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppLayout implements OnInit {
  protected readonly shell = inject(AppShellService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly streak = computed(() => this.shell.stats()?.currentStreak ?? null);
  protected readonly displayName = computed(() => {
    const profile = this.shell.profile();
    return profile?.displayName || profile?.username || this.auth.username() || '';
  });

  protected readonly navItems = computed<NavItem[]>(() => [
    { label: 'Bosh sahifa', icon: 'home', link: '/dashboard' },
    { label: "Lug'at", icon: 'book', link: '/vocabulary' },
    { label: "To'plamlar", icon: 'layers', link: '/decks' },
    { label: "O'rganish", icon: 'play', link: '/study' },
    { label: "Mening so'zlarim", icon: 'star', link: '/my-words' },
    { label: 'Statistika', icon: 'chart', link: '/stats' },
    { label: "Do'stlar", icon: 'users', link: '/friends' },
    { label: 'Bildirishnomalar', icon: 'bell', link: '/notifications', badge: this.shell.unreadCount() },
    { label: 'Sozlamalar', icon: 'settings', link: '/settings' },
  ]);

  constructor() {
    // Yangi sahifa o'z sarlavhasini konstruktorida o'rnatadi — eskisini oldinroq tozalaymiz.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.shell.pageHeader.set(null));

    // Har sahifa almashganda o'qilmaganlar sonini yangilaymiz va mobil menyuni yopamiz.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.shell.refreshUnreadCount();
      });

    // Seansni vaqti-vaqti bilan tekshiramiz: "Faol seanslar"dan boshqa qurilmada chiqarib yuborilsa,
    // so'rov 401 qaytaradi, refresh ham rad etiladi va authInterceptor userni /login'ga chiqaradi.
    // Bildirishnomalar soni ham shu bilan yangilanib turadi.
    merge(
      interval(SESSION_CHECK_MS),
      fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
    )
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.shell.refreshUnreadCount());

    // Mobil menyu ochiqligida sahifa scroll bo'lmasin.
    effect(() => {
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  ngOnInit(): void {
    // Boshqa user seansidan qolgan ma'lumot bir lahza ham ko'rinmasin.
    if (this.shell.profile()?.id !== this.auth.session()?.userId) this.shell.clear();
    this.shell.refreshProfile();
    this.shell.refreshStats();
  }

  protected onSearch(query: string): void {
    void this.router.navigate(['/vocabulary'], { queryParams: { search: query } });
  }
}
