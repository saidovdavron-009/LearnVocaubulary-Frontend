import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';
import { NavItem } from './nav-item.model';

/** Figma: 18 Admin panel → Admin sidebar (248px, to'q fon). */
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-62 flex-col gap-2 overflow-y-auto bg-ink px-4 py-6' },
  template: `
    <a
      routerLink="/admin"
      class="mb-3 flex items-center self-start rounded-input pl-2"
      aria-label="So'zchi admin — umumiy ko'rinish"
      (click)="navigate.emit()"
    >
      <app-logo tone="yellow" [inverse]="true" caption="Admin" />
    </a>

    <nav aria-label="Admin menyusi" class="flex flex-col gap-1.5">
      @for (item of items(); track item.link) {
        <a
          [routerLink]="item.link"
          routerLinkActive="bg-violet !text-fg-inverse hover:!bg-violet"
          [routerLinkActiveOptions]="{ exact: item.link === '/admin' }"
          ariaCurrentWhenActive="page"
          class="flex h-11 items-center gap-3 rounded-lg px-3.5 text-body-strong text-line-strong transition-colors hover:bg-fg-inverse/8"
          (click)="navigate.emit()"
        >
          <app-icon [name]="item.icon" [size]="20" />
          <span class="flex-1 truncate">{{ item.label }}</span>
          @if (item.badge) {
            <span
              class="min-w-5.5 rounded-full bg-coral-strong px-1.75 py-0.5 text-center text-caption text-fg-inverse"
            >
              {{ item.badge > 99 ? '99+' : item.badge }}
            </span>
          }
        </a>
      }
    </nav>
  `,
})
export class AdminSidebar {
  readonly items = input.required<NavItem[]>();
  readonly navigate = output<void>();
}
