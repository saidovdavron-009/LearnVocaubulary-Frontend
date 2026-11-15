import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';

export interface SiteLink {
  label: string;
  link: string;
}

/** Figma: Site/Header (1440 × 76). */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, Button, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-30 block border-b border-line bg-page' },
  template: `
    <div class="mx-auto flex h-19 max-w-360 items-center gap-7 px-4 md:px-10 xl:px-25">
      <a routerLink="/" class="rounded-input" aria-label="So'zchi — bosh sahifa">
        <app-logo />
      </a>

      <nav aria-label="Sayt menyusi" class="hidden flex-1 items-center gap-1 lg:flex">
        @for (item of links(); track item.label) {
          <a
            [routerLink]="item.link"
            [routerLinkActive]="item.link === '/' ? '' : 'bg-violet-soft !text-fg'"
            class="rounded-md px-3.5 py-2.5 text-body-strong text-fg-secondary transition-colors hover:text-fg"
          >
            {{ item.label }}
          </a>
        }
      </nav>

      <div class="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-7">
        <button
          type="button"
          class="hidden h-11 items-center gap-2 rounded-lg border-2 border-line bg-surface px-3 text-body-strong text-fg lg:flex"
          aria-haspopup="listbox"
          aria-label="Interfeys tili"
        >
          <app-icon name="globe" [size]="18" />
          <span>English</span>
          <app-icon name="chevron-down" [size]="16" />
        </button>

        @if (authenticated()) {
          <a appButton routerLink="/dashboard" variant="primary" size="m" icon="arrow-right">Ilovaga o'tish</a>
        } @else {
          <a routerLink="/login" class="hidden rounded-lg px-4 py-3 text-body-strong text-fg sm:block">Kirish</a>
          <a appButton routerLink="/register" variant="primary" size="m">Bepul boshlash</a>
        }

        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-lg border-2 border-line bg-surface text-fg lg:hidden"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="site-mobile-menu"
          aria-label="Menyu"
          (click)="menuOpen.set(!menuOpen())"
        >
          <app-icon [name]="menuOpen() ? 'x' : 'grid'" [size]="20" />
        </button>
      </div>
    </div>

    @if (menuOpen()) {
      <nav
        id="site-mobile-menu"
        aria-label="Sayt menyusi"
        class="flex flex-col gap-1 border-t border-line bg-page px-4 py-3 lg:hidden"
      >
        @for (item of links(); track item.label) {
          <a
            [routerLink]="item.link"
            [routerLinkActive]="item.link === '/' ? '' : 'bg-violet-soft !text-fg'"
            class="rounded-md px-3.5 py-2.5 text-body-strong text-fg-secondary"
            (click)="menuOpen.set(false)"
          >
            {{ item.label }}
          </a>
        }
        @if (!authenticated()) {
          <a routerLink="/login" class="rounded-md px-3.5 py-2.5 text-body-strong text-fg sm:hidden" (click)="menuOpen.set(false)">
            Kirish
          </a>
        }
      </nav>
    }
  `,
})
export class SiteHeader {
  readonly links = input.required<SiteLink[]>();
  /** Tizimga kirgan user uchun "Kirish / Bepul boshlash" o'rniga ilovaga o'tish tugmasi. */
  readonly authenticated = input(false);
  protected readonly menuOpen = signal(false);
}
