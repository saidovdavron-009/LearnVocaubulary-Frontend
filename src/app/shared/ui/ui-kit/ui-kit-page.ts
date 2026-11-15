import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WordStatus } from '../../../core/api/enums';
import { Avatar, AvatarColor } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { Button, ButtonSize, ButtonVariant } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { Icon } from '../icon/icon';
import { ICONS, IconName } from '../icon/icons';
import { Input } from '../input/input';
import { AdminSidebar } from '../layout/admin-sidebar';
import { AppSidebar } from '../layout/app-sidebar';
import { AppTopbar } from '../layout/app-topbar';
import { NavItem } from '../layout/nav-item.model';
import { SiteFooter } from '../layout/site-footer';
import { SiteHeader } from '../layout/site-header';
import { Modal } from '../modal/modal';
import { Pagination } from '../pagination/pagination';
import { ProgressBar } from '../progress/progress-bar';
import { ProgressRing } from '../progress/progress-ring';
import { Skeleton } from '../skeleton/skeleton';
import { EmptyState } from '../state/empty-state';
import { ErrorState } from '../state/error-state';
import { Tab } from '../tab/tab';
import { Table } from '../table/table';
import { Tag, TagColor } from '../tag/tag';
import { ToastService } from '../toast/toast.service';
import { Toggle } from '../toggle/toggle';

/**
 * VAQTINCHALIK: dizayn tizimi komponentlarini Figma bilan solishtirish uchun sahifa (/ui-kit).
 * Bu yerdagi matn va raqamlar — namuna. Admin panel tayyor bo'lgach o'chiriladi.
 */
@Component({
  selector: 'app-ui-kit-page',
  imports: [
    ReactiveFormsModule,
    Avatar,
    Badge,
    Button,
    Checkbox,
    Icon,
    Input,
    AdminSidebar,
    AppSidebar,
    AppTopbar,
    SiteFooter,
    SiteHeader,
    Modal,
    Pagination,
    ProgressBar,
    ProgressRing,
    Skeleton,
    EmptyState,
    ErrorState,
    Tab,
    Table,
    Tag,
    Toggle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-page' },
  template: `
    <div class="mx-auto flex max-w-300 flex-col gap-10 px-4 py-10 md:px-8">
      <header class="flex flex-col gap-2">
        <p class="text-label-caps text-violet-text uppercase">Vaqtinchalik sahifa</p>
        <h1 class="font-display text-h1 text-fg">UI kit</h1>
        <p class="text-body-lg text-fg-secondary">So'zchi dizayn tizimi — Figma "2. Komponentlar va ranglar".</p>
      </header>

      <!-- Matn o'lchamlari -->
      <section class="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Matn</h2>
        <p class="font-display text-display">Display XL</p>
        <p class="font-display text-h1">H1 sarlavha</p>
        <p class="font-display text-h2">H2 sarlavha</p>
        <p class="font-display text-h3">H3 sarlavha</p>
        <p class="font-display text-number">2 340</p>
        <p class="text-body-lg">Body Large — har kuni 10 daqiqa va yangi til sizniki.</p>
        <p class="text-body">Body — aqlli takrorlash tizimi bilan so'zlarni unutmang.</p>
        <p class="text-body-strong">Body Strong</p>
        <p class="text-label">Label</p>
        <p class="text-label-caps uppercase">Label caps</p>
        <p class="text-caption">Caption</p>
      </section>

      <!-- Tugmalar -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Button</h2>
        @for (variant of variants; track variant) {
          <div class="flex flex-wrap items-center gap-4">
            @for (size of sizes; track size) {
              <button appButton type="button" [variant]="variant" [size]="size" icon="arrow-right">Button</button>
            }
          </div>
        }
        <div class="flex flex-wrap items-center gap-4">
          <button appButton type="button" iconLeft="play">Ikonka chapda</button>
          <button appButton type="button" variant="soft" [loading]="true">Yuklanmoqda</button>
          <button appButton type="button" variant="secondary" disabled>O'chirilgan</button>
          <button appButton type="button" variant="dark" [iconOnly]="true" icon="speaker" aria-label="Tinglash"></button>
        </div>
      </section>

      <!-- Badge, Tag, Tab -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Badge · Tag · Tab</h2>
        <div class="flex flex-wrap gap-3">
          @for (status of statuses; track status) {
            <app-badge [status]="status" />
          }
        </div>
        <div class="flex flex-wrap gap-3">
          @for (color of tagColors; track color) {
            <app-tag [color]="color">B1</app-tag>
          }
        </div>
        <div role="tablist" aria-label="Namuna" class="flex flex-wrap gap-3">
          @for (tab of tabs; track tab.label; let i = $index) {
            <button appTab [active]="activeTab() === i" [count]="tab.count" (click)="activeTab.set(i)">
              {{ tab.label }}
            </button>
          }
        </div>
      </section>

      <!-- Input -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Input</h2>
        <form [formGroup]="form" class="grid gap-6 md:grid-cols-3" (submit)="$event.preventDefault()">
          <app-input
            label="Email"
            icon="mail"
            type="email"
            placeholder="siz@example.com"
            helper="Yordamchi matn"
            formControlName="email"
          />
          <app-input label="Parol" icon="lock" type="password" placeholder="••••••••" formControlName="password" />
          <app-input
            label="Xato holati"
            icon="mail"
            placeholder="siz@example.com"
            error="Bu email allaqachon ro'yxatdan o'tgan"
          />
        </form>
        <div>
          <button appButton type="button" variant="secondary" size="s" (click)="form.markAllAsTouched()">
            Validatsiyani ko'rsatish
          </button>
        </div>
      </section>

      <!-- Avatar, Toggle, Checkbox -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Avatar · Toggle · Checkbox</h2>
        <div class="flex flex-wrap items-center gap-3">
          @for (color of avatarColors; track color) {
            <app-avatar name="Malika" [color]="color" />
          }
          <app-avatar name="Asilbek" [size]="44" />
        </div>
        <div class="flex flex-wrap items-center gap-6">
          <label class="flex items-center gap-3 text-body-strong">
            <app-toggle label="Kunlik eslatma" [(checked)]="toggleOn" /> Kunlik eslatma
          </label>
          <app-toggle label="O'chiq namunasi" />
          <app-checkbox label="Tanlash" [(checked)]="checkOn" />
          <app-checkbox label="Qisman tanlangan" [indeterminate]="true" />
        </div>
      </section>

      <!-- Progress -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Progress</h2>
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-10">
          <div class="flex flex-1 flex-col gap-4">
            <app-progress-bar [value]="progress()" color="mint" label="To'plam progressi" />
            <app-progress-bar [value]="64" color="violet" label="Xotira" />
            <app-progress-bar [value]="38" color="yellow" label="Xotira" />
          </div>
          <app-progress-ring [value]="ringValue()" [max]="10" label="Kunlik maqsad">
            <span class="font-display text-number text-fg">{{ ringValue() }}/10</span>
          </app-progress-ring>
          <button appButton type="button" variant="soft" size="s" (click)="bump()">+ progress</button>
        </div>
      </section>

      <!-- Jadval va sahifalash -->
      <section class="flex flex-col overflow-hidden rounded-3xl border-2 border-line bg-surface">
        <h2 class="p-6 font-display text-h2">Jadval · Sahifalash</h2>
        <app-table>
          <table>
            <thead>
              <tr>
                <th class="w-10"><span class="sr-only">Tanlash</span></th>
                <th>So'z</th>
                <th>Tarjima</th>
                <th>Daraja</th>
                <th>Holat</th>
                <th>Xotira</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.word; let i = $index) {
                <tr [attr.data-selected]="selectedRows()[i] || null">
                  <td>
                    <app-checkbox
                      [label]="row.word + ' so‘zini tanlash'"
                      [checked]="selectedRows()[i]"
                      (checkedChange)="toggleRow(i, $event)"
                    />
                  </td>
                  <td>
                    <div class="flex items-center gap-3">
                      <app-avatar [name]="row.word" [size]="36" />
                      <span class="text-body-strong">{{ row.word }}</span>
                    </div>
                  </td>
                  <td>{{ row.translation }}</td>
                  <td><app-tag color="gray">{{ row.level }}</app-tag></td>
                  <td><app-badge [status]="row.status" /></td>
                  <td class="w-40"><app-progress-bar [value]="row.memory" [color]="row.memory > 90 ? 'mint' : 'violet'" /></td>
                </tr>
              }
            </tbody>
          </table>
        </app-table>
        <app-pagination
          class="border-t border-line px-5 py-4"
          [page]="page()"
          [pageSize]="pageSize()"
          [totalCount]="248"
          [totalPages]="totalPages()"
          (pageChange)="page.set($event)"
          (pageSizeChange)="pageSize.set($event); page.set(1)"
        />
      </section>

      <!-- Modal, Toast -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Modal · Toast</h2>
        <div class="flex flex-wrap gap-3">
          <button appButton type="button" (click)="modalOpen.set(true)">Modalni ochish</button>
          <button appButton type="button" variant="secondary" (click)="toast.success('Saqlandi')">Toast: muvaffaqiyat</button>
          <button appButton type="button" variant="secondary" (click)="toast.error('Login yoki parol noto‘g‘ri.')">
            Toast: xato
          </button>
          <button appButton type="button" variant="secondary" (click)="toast.info('Yangi bildirishnoma')">Toast: info</button>
        </div>
        <app-modal [(open)]="modalOpen" title="To'plam yaratish" description="Yangi to'plamga nom bering.">
          <app-input label="Nomi" placeholder="Masalan: IELTS so'zlari" />
          <div modal-actions class="contents">
            <button appButton type="button" variant="secondary" (click)="modalOpen.set(false)">Bekor qilish</button>
            <button appButton type="button" (click)="modalOpen.set(false)">Yaratish</button>
          </div>
        </app-modal>
      </section>

      <!-- Holatlar -->
      <section class="grid gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-6">
          <h2 class="font-display text-h3">Skeleton</h2>
          <div class="flex items-center gap-3">
            <app-skeleton class="size-10 rounded-full" />
            <div class="flex flex-1 flex-col gap-2">
              <app-skeleton class="h-4 w-3/4" />
              <app-skeleton class="h-3 w-1/2" />
            </div>
          </div>
          <app-skeleton class="h-24 rounded-card" />
        </div>
        <div class="rounded-3xl border-2 border-line bg-surface">
          <app-empty-state icon="layers" title="Hali to'plam yo'q" text="Birinchi to'plamingizni yarating.">
            <button appButton type="button" size="s" icon="plus">To'plam yaratish</button>
          </app-empty-state>
        </div>
        <div class="rounded-3xl border-2 border-line bg-surface">
          <app-error-state message="Server bilan aloqa yo'q." (retry)="toast.info('Qayta urinilmoqda...')" />
        </div>
      </section>

      <!-- Ikonkalar -->
      <section class="flex flex-col gap-5 rounded-3xl border-2 border-line bg-surface p-6">
        <h2 class="font-display text-h2">Ikonkalar ({{ iconNames.length }})</h2>
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
          @for (name of iconNames; track name) {
            <div class="flex flex-col items-center gap-2 rounded-lg bg-page p-3 text-fg">
              <app-icon [name]="name" />
              <span class="text-caption text-fg-muted">{{ name }}</span>
            </div>
          }
        </div>
      </section>

      <!-- Layout -->
      <section class="flex flex-col gap-5">
        <h2 class="font-display text-h2">Layout</h2>
        <div class="overflow-hidden rounded-3xl border-2 border-line">
          <app-site-header class="!static" [links]="siteLinks" />
        </div>
        <div class="flex h-200 overflow-hidden rounded-3xl border-2 border-line">
          <app-sidebar [items]="navItems" [streakDays]="12" />
          <div class="flex-1 bg-page">
            <app-topbar name="Asilbek" [streak]="12" [xp]="2340" [unreadCount]="3" />
          </div>
        </div>
        <div class="flex h-150 overflow-hidden rounded-3xl border-2 border-line">
          <app-admin-sidebar [items]="adminItems" />
          <div class="flex-1 bg-page"></div>
        </div>
        <div class="overflow-hidden rounded-3xl">
          <app-site-footer [columns]="footerColumns" />
        </div>
      </section>
    </div>
  `,
})
export class UiKitPage {
  protected readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly variants: ButtonVariant[] = ['primary', 'secondary', 'dark', 'soft', 'yellow'];
  protected readonly sizes: ButtonSize[] = ['l', 'm', 's'];
  protected readonly statuses: WordStatus[] = ['new', 'learning', 'review', 'mastered'];
  protected readonly tagColors: TagColor[] = ['violet', 'blue', 'yellow', 'mint', 'coral', 'gray'];
  protected readonly avatarColors: AvatarColor[] = ['violet', 'yellow', 'coral', 'mint', 'blue'];
  protected readonly iconNames = Object.keys(ICONS) as IconName[];
  protected readonly tabs = [
    { label: 'Hammasi', count: 248 },
    { label: 'Sevimlilar', count: 18 },
    { label: 'Bugun takror', count: 24 },
    { label: 'Qiyinlar', count: 12 },
  ];

  protected readonly activeTab = signal(0);
  protected readonly toggleOn = signal(true);
  protected readonly checkOn = signal(true);
  protected readonly modalOpen = signal(false);
  protected readonly progress = signal(64);
  protected readonly ringValue = signal(7);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalPages = () => Math.ceil(248 / this.pageSize());

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly rows: { word: string; translation: string; level: string; status: WordStatus; memory: number }[] = [
    { word: 'brave', translation: 'jasur', level: 'B1', status: 'review', memory: 64 },
    { word: 'journey', translation: 'sayohat', level: 'A2', status: 'mastered', memory: 96 },
    { word: 'improve', translation: 'yaxshilamoq', level: 'B1', status: 'learning', memory: 38 },
    { word: 'reliable', translation: 'ishonchli', level: 'B2', status: 'new', memory: 0 },
  ];
  protected readonly selectedRows = signal([true, false, false, false]);

  protected readonly navItems: NavItem[] = [
    { label: 'Bosh sahifa', icon: 'home', link: '/ui-kit' },
    { label: "Lug'at", icon: 'book', link: '/vocabulary' },
    { label: "To'plamlar", icon: 'layers', link: '/decks' },
    { label: "O'rganish", icon: 'play', link: '/study' },
    { label: "Mening so'zlarim", icon: 'star', link: '/my-words' },
    { label: 'Statistika', icon: 'chart', link: '/stats' },
    { label: "Do'stlar", icon: 'users', link: '/friends' },
    { label: 'Bildirishnomalar', icon: 'bell', link: '/notifications', badge: 3 },
    { label: 'Sozlamalar', icon: 'settings', link: '/settings' },
  ];
  protected readonly adminItems: NavItem[] = [
    { label: 'Umumiy', icon: 'grid', link: '/ui-kit' },
    { label: 'Foydalanuvchilar', icon: 'users', link: '/admin/users' },
    { label: "So'zlar", icon: 'book', link: '/admin/words' },
    { label: 'Shikoyatlar', icon: 'flag', link: '/admin/reports', badge: 7 },
  ];
  protected readonly siteLinks = [
    { label: "Lug'at", link: '/vocabulary' },
    { label: "To'plamlar", link: '/decks' },
    { label: 'Mashqlar', link: '/study' },
    { label: 'Reyting', link: '/friends' },
  ];
  protected readonly footerColumns = [
    { title: 'Mahsulot', links: [{ label: "Lug'at", link: '/vocabulary' }] },
    { title: 'Yordam', links: [{ label: 'Savol-javob', link: '/' }] },
  ];

  protected bump(): void {
    this.progress.update((v) => (v >= 100 ? 10 : v + 15));
    this.ringValue.update((v) => (v >= 10 ? 1 : v + 1));
  }

  protected toggleRow(index: number, value: boolean): void {
    this.selectedRows.update((rows) => rows.map((r, i) => (i === index ? value : r)));
  }
}
