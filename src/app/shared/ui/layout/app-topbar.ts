import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, AvatarColor } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { formatNumber, formatUzDate } from './format';

/** Figma: App/Topbar — salomlashish, qidiruv, seriya va XP chiplari, qo'ng'iroqcha, avatar. */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink, Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-19 items-center gap-3 bg-page px-4 md:gap-4 md:px-8',
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <button
      type="button"
      class="flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-surface text-fg lg:hidden"
      aria-label="Menyuni ochish"
      (click)="menuToggle.emit()"
    >
      <app-icon name="grid" [size]="20" />
    </button>

    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      @if (title()) {
        <h1 class="truncate font-display text-h3 text-fg">{{ title() }}</h1>
        <p class="truncate text-caption text-fg-muted">{{ subtitle() ?? today }}</p>
      } @else {
        <p class="truncate font-display text-h3 text-fg">Salom, {{ name() }}!</p>
        <p class="truncate text-caption text-fg-muted">{{ today }}</p>
      }
    </div>

    <form role="search" class="hidden w-80 md:block" (submit)="submitSearch($event)">
      <label
        class="flex h-11 items-center gap-2.5 rounded-input border-2 border-line bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-violet focus-within:shadow-focus"
      >
        <app-icon name="search" [size]="18" class="text-fg-muted" />
        <span class="sr-only">So'z qidirish</span>
        <input
          #searchInput
          type="search"
          name="search"
          placeholder="So'z qidirish..."
          autocomplete="off"
          class="min-w-0 flex-1 bg-transparent text-body font-semibold text-fg outline-none placeholder:text-fg-muted"
        />
        <kbd class="rounded-xs bg-muted px-1.5 py-0.5 font-sans text-caption text-fg-muted">/</kbd>
      </label>
    </form>

    @if (streak() !== null) {
      <div
        class="hidden h-11 items-center gap-1.5 rounded-lg bg-coral-soft px-3 text-body-strong text-fg sm:flex"
        [attr.aria-label]="streak() + ' kunlik seriya'"
      >
        <app-icon name="flame" [size]="18" class="text-coral-strong" />
        <span>{{ streak() }}</span>
      </div>
    }
    @if (xpText()) {
      <div class="hidden h-11 items-center gap-1.5 rounded-lg bg-yellow-soft px-3 text-body-strong text-fg sm:flex">
        <app-icon name="bolt" [size]="18" class="text-yellow-text" />
        <span>{{ xpText() }}</span>
      </div>
    }

    <a
      routerLink="/notifications"
      class="relative flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-surface text-fg transition-colors hover:bg-muted"
      [attr.aria-label]="bellLabel()"
    >
      <app-icon name="bell" [size]="20" />
      @if (unreadCount()) {
        <span class="absolute top-2 right-2.5 size-2 rounded-full bg-coral-strong ring-2 ring-surface"></span>
      }
    </a>

    <a routerLink="/settings" class="shrink-0 rounded-full" aria-label="Profil va sozlamalar">
      <app-avatar [name]="name() || '?'" [src]="avatarUrl()" [color]="avatarColor()" [size]="44" />
    </a>
  `,
})
export class AppTopbar {
  readonly name = input.required<string>();
  /** Berilsa salomlashish o'rniga sahifa nomi ko'rinadi (Figma: 06, 13, 17 ekranlar). */
  readonly title = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly avatarUrl = input<string | null>(null);
  readonly avatarColor = input<AvatarColor | null>('violet');
  readonly streak = input<number | null>(null);
  readonly xp = input<number | null>(null);
  readonly unreadCount = input(0);

  /** "search" deb nomlanmaydi: type="search" input brauzerning o'zining "search" hodisasini chiqaradi va u to'qnashadi. */
  readonly searchSubmit = output<string>();
  readonly menuToggle = output<void>();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly today = formatUzDate(new Date());
  protected readonly xpText = computed(() => {
    const xp = this.xp();
    return xp === null ? null : `${formatNumber(xp)} XP`;
  });
  protected readonly bellLabel = computed(() =>
    this.unreadCount() ? `Bildirishnomalar, ${this.unreadCount()} ta o'qilmagan` : 'Bildirishnomalar',
  );

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const value = this.searchInput()?.nativeElement.value.trim() ?? '';
    if (value) this.searchSubmit.emit(value);
  }

  /** "/" tugmasi qidiruvga fokus beradi (dizayndagi klaviatura belgisi). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
      return;
    }
    const input = this.searchInput()?.nativeElement;
    if (input && input.offsetParent !== null) {
      event.preventDefault();
      input.focus();
    }
  }
}
