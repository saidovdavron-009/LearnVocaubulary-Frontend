import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OAuthProvider } from '../../../../../core/api/enums';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { UnlinkOAuthService } from './unlink-oauth.service';

const PROVIDERS: { id: OAuthProvider; label: string; icon: IconName }[] = [
  { id: 'google', label: 'Google', icon: 'globe' },
  { id: 'telegram', label: 'Telegram', icon: 'send' },
  { id: 'apple', label: 'Apple', icon: 'user' },
  { id: 'github', label: 'GitHub', icon: 'link' },
];

/**
 * Figma: 17 — "Ulangan hisoblar". Ulangan hisobni uzish mumkin.
 * "Ulash" OAuth provayderlari (backend OAuth sozlamalari) berilgach ishlaydi.
 */
@Component({
  selector: 'app-unlink-oauth',
  imports: [Button, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section id="accounts" class="scroll-mt-6 rounded-3xl border-2 border-line bg-surface p-6 md:p-7" aria-labelledby="accounts-title">
      <h2 id="accounts-title" class="font-display text-h3 text-fg">Ulangan hisoblar</h2>
      <p class="mt-1 text-body text-fg-secondary">Tezkor kirish uchun ulangan tashqi hisoblar.</p>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @if (profile(); as p) {
          @for (provider of providers; track provider.id) {
            @let linked = p.linkedProviders.includes(provider.id);
            <div class="flex flex-col gap-3 rounded-card border-2 p-4" [class]="linked ? 'border-line bg-page' : 'border-line bg-surface'">
              <div class="flex items-center justify-between">
                <span class="flex size-10 items-center justify-center rounded-lg bg-surface text-fg shadow-hard-sm shadow-line">
                  <app-icon [name]="provider.icon" [size]="20" />
                </span>
                @if (linked) {
                  <span class="rounded-md bg-mint-soft px-2 py-1 text-caption text-mint-text">Ulangan</span>
                } @else {
                  <span class="rounded-md bg-muted px-2 py-1 text-caption text-fg-muted">Ulanmagan</span>
                }
              </div>
              <p class="text-body-strong text-fg">{{ provider.label }}</p>
              @if (linked) {
                <button
                  appButton
                  type="button"
                  variant="secondary"
                  size="s"
                  [block]="true"
                  [loading]="busy() === provider.id"
                  (click)="unlink(provider.id, provider.label)"
                >
                  Uzish
                </button>
              } @else {
                <button appButton type="button" variant="soft" size="s" [block]="true" (click)="link(provider.label)">Ulash</button>
              }
            </div>
          }
        } @else {
          @for (i of [1, 2, 3, 4]; track i) {
            <app-skeleton class="h-34 rounded-card" />
          }
        }
      </div>
    </section>
  `,
})
export class UnlinkOAuth {
  private readonly service = inject(UnlinkOAuthService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);

  protected readonly providers = PROVIDERS;
  protected readonly profile = computed(() => this.shell.profile());
  protected readonly busy = signal<OAuthProvider | null>(null);

  /** OAuth provayderlari (client ID'lar) backend sozlamalarida berilgach, shu yerda kirish oynasi ochiladi. */
  protected link(label: string): void {
    this.toast.info(`${label} orqali ulash hali sozlanmagan — administrator OAuth kalitlarini qo'shgach ishlaydi.`);
  }

  protected unlink(provider: OAuthProvider, label: string): void {
    this.busy.set(provider);
    this.service.unlink(provider).subscribe({
      next: () => {
        this.busy.set(null);
        this.shell.refreshProfile();
        this.toast.success(`${label} hisobi uzildi`);
      },
      // Xato (masalan, "kirishning yagona usuli") toast orqali ko'rsatiladi.
      error: () => this.busy.set(null),
    });
  }
}
