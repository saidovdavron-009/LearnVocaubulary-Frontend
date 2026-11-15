import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OAuthProvider } from '../../../../../core/api/enums';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';

const PROVIDERS: { id: OAuthProvider; label: string; icon: IconName }[] = [
  { id: 'google', label: 'Google', icon: 'globe' },
  { id: 'telegram', label: 'Telegram', icon: 'send' },
  { id: 'apple', label: 'Apple', icon: 'user' },
  { id: 'github', label: 'GitHub', icon: 'link' },
];

/**
 * Figma: 02 Kirish — tashqi hisoblar bilan kirish tugmalari va "yoki email bilan" ajratgichi.
 * Backend POST /api/auth/oauth provayder tokenini kutadi; provayder kalitlari (OAuth:*) sozlanmaguncha
 * tugma foydalanuvchiga buni tushuntiradi.
 */
@Component({
  selector: 'app-oauth-buttons',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-7 flex flex-col gap-5' },
  template: `
    <div class="grid grid-cols-2 gap-2.5">
      @for (p of providers; track p.id) {
        <button
          type="button"
          class="flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-line bg-surface text-body-strong text-fg shadow-hard shadow-line transition-[translate,box-shadow] hover:bg-page active:translate-y-0.5 active:shadow-hard-sm"
          (click)="signIn(p.label)"
        >
          {{ p.label }} <app-icon [name]="p.icon" [size]="18" />
        </button>
      }
    </div>
    <div class="flex items-center gap-3 text-label text-fg-muted" role="separator">
      <span class="h-0.5 flex-1 bg-line"></span> yoki email bilan <span class="h-0.5 flex-1 bg-line"></span>
    </div>
  `,
})
export class OAuthButtons {
  private readonly toast = inject(ToastService);
  protected readonly providers = PROVIDERS;

  protected signIn(label: string): void {
    this.toast.info(`${label} orqali kirish hali sozlanmagan — hozircha email va parol bilan kiring.`);
  }
}
