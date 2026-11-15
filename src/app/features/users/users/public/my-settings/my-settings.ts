import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { ChangePassword } from '../change-password/change-password';
import { DeleteMyAccount } from '../delete-my-account/delete-my-account';
import { UnlinkOAuth } from '../unlink-oauth/unlink-oauth';
import { MySessions } from '../my-sessions/my-sessions';
import { UpdateMyProfile } from '../update-my-profile/update-my-profile';
import { UpdateMySettings } from '../update-my-settings/update-my-settings';

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'profile', label: 'Profil', icon: 'user' },
  { id: 'learning', label: "O'rganish", icon: 'target' },
  { id: 'notifications', label: 'Bildirishnomalar', icon: 'bell' },
  { id: 'accounts', label: 'Ulangan hisoblar', icon: 'link' },
  { id: 'security', label: 'Xavfsizlik', icon: 'shield' },
  { id: 'region', label: 'Til va mintaqa', icon: 'globe' },
];

/**
 * Figma: 17 Profil va sozlamalar. Har bir karta o'z amal papkasidagi komponent.
 * Backend'da userda bitta seans bo'lgani uchun "Faol seanslar" bloki yo'q.
 */
@Component({
  selector: 'app-my-settings',
  imports: [Icon, UpdateMyProfile, UpdateMySettings, UnlinkOAuth, MySessions, ChangePassword, DeleteMyAccount],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav
        aria-label="Sozlamalar bo'limlari"
        class="flex shrink-0 gap-1 overflow-x-auto rounded-3xl border-2 border-line bg-surface p-2.5 lg:sticky lg:top-4 lg:w-59 lg:flex-col"
      >
        @for (section of sections; track section.id) {
          <button
            type="button"
            class="flex h-11 shrink-0 items-center gap-3 rounded-input px-3.5 text-body-strong transition-colors"
            [class]="active() === section.id ? 'bg-violet-soft text-violet-text' : 'text-fg-secondary hover:bg-muted'"
            [attr.aria-current]="active() === section.id ? 'true' : null"
            (click)="scrollTo(section.id)"
          >
            <app-icon [name]="section.icon" [size]="18" />
            {{ section.label }}
          </button>
        }
        <div class="mx-2 my-1 hidden h-px bg-line lg:block"></div>
        <button
          type="button"
          class="flex h-11 shrink-0 items-center gap-3 rounded-input px-3.5 text-body-strong text-coral-text transition-colors hover:bg-coral-soft"
          (click)="signOut()"
        >
          <app-icon name="logout" [size]="18" />
          Chiqish
        </button>
      </nav>

      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <app-update-my-profile />
        <app-update-my-settings />
        <app-unlink-oauth />
        <app-my-sessions />
        <app-change-password />
        <app-delete-my-account />
      </div>
    </div>
  `,
})
export class MySettings {
  private readonly auth = inject(AuthService);
  private readonly shell = inject(AppShellService);

  protected readonly sections = SECTIONS;
  protected readonly active = signal('profile');

  constructor() {
    this.shell.setPageHeader('Sozlamalar', "Profil, o'rganish va xavfsizlik");
    this.shell.refreshProfile();
    this.shell.refreshStats();
  }

  protected scrollTo(id: string): void {
    this.active.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected signOut(): void {
    this.auth.signOut().subscribe(() => this.shell.clear());
  }
}
