import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';
import { NavItem } from './nav-item.model';

/** Figma: App/Sidebar (264px). Aktiv bo'lim binafsha fonda, pastida sariq seriya kartochkasi. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-full w-66 flex-col gap-1.5 overflow-y-auto border-r border-line bg-surface px-4 py-6',
  },
  template: `
    <a
      routerLink="/dashboard"
      class="flex h-16 items-start self-start rounded-input pl-2"
      aria-label="So'zchi — bosh sahifa"
      (click)="navigate.emit()"
    >
      <app-logo />
    </a>

    <nav aria-label="Asosiy menyu" class="flex flex-col gap-1.5">
      @for (item of items(); track item.link) {
        <a
          [routerLink]="item.link"
          routerLinkActive="bg-violet-soft !text-violet-text hover:!bg-violet-soft"
          ariaCurrentWhenActive="page"
          class="flex h-12 items-center gap-3 rounded-input px-3.5 text-body-strong text-fg-secondary transition-colors hover:bg-muted"
          (click)="navigate.emit()"
        >
          <app-icon [name]="item.icon" [size]="22" />
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

    @if (streakDays() !== null) {
      <div class="mt-auto flex shrink-0 flex-col gap-2 rounded-card bg-yellow p-4 shadow-hard shadow-yellow-deep">
        <div class="flex items-center gap-2 text-fg">
          <app-icon name="flame" [size]="22" />
          <span class="text-body-strong">{{ streakDays() }} kunlik seriya</span>
        </div>
        <p class="text-caption text-yellow-text">Bugun ham mashq qiling — seriyani uzmang!</p>
      </div>
    }
  `,
})
export class AppSidebar {
  readonly items = input.required<NavItem[]>();
  readonly streakDays = input<number | null>(null);
  /** Havola bosilganda (mobil menyuni yopish uchun). */
  readonly navigate = output<void>();
}
