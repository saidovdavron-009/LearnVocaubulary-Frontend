import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiUrl } from '../../../core/api/api-url';
import { problemMessage } from '../../../core/api/problem-details';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

/**
 * Admin: Sozlamalar. Platforma sozlamalari uchun alohida API yo'q, shuning uchun bu yerda:
 * barcha userlarga e'lon yuborish (POST /api/admin/notifications), API hujjatlari va shaxsiy sozlamalar havolasi.
 */
@Component({
  selector: 'app-admin-settings',
  imports: [RouterLink, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex max-w-200 flex-col gap-6' },
  template: `
    <header>
      <h1 class="font-display text-h1 text-fg">Sozlamalar</h1>
      <p class="mt-1 text-body-lg text-fg-secondary">E'lonlar, API hujjatlari va hisob</p>
    </header>

    <section class="rounded-2xl border-2 border-line bg-surface p-6" aria-labelledby="broadcast-title">
      <h2 id="broadcast-title" class="font-display text-h3 text-fg">E'lon yuborish</h2>
      <p class="mt-1 text-body text-fg-secondary">Barcha faol foydalanuvchilarga "Bildirishnomalar" bo'limida ko'rinadi.</p>
      <form class="mt-5 flex flex-col gap-4" (submit)="$event.preventDefault(); send()">
        <label class="flex flex-col gap-2">
          <span class="text-label text-fg">Sarlavha <span class="text-coral-strong">*</span></span>
          <input
            type="text"
            maxlength="200"
            class="h-12 rounded-input border-2 border-line px-3.5 text-body font-semibold text-fg outline-none focus:border-violet focus:shadow-focus"
            placeholder="Yangi to'plam: Ish suhbati uchun 120 so'z"
            [value]="title()"
            (input)="title.set($any($event.target).value)"
          />
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-label text-fg">Matn</span>
          <textarea
            rows="3"
            class="rounded-input border-2 border-line px-3.5 py-3 text-body text-fg outline-none focus:border-violet focus:shadow-focus"
            [value]="body()"
            (input)="body.set($any($event.target).value)"
          ></textarea>
        </label>
        <div class="flex justify-end">
          <button appButton type="submit" icon="send" [loading]="sending()" [disabled]="!title().trim()">Yuborish</button>
        </div>
      </form>
    </section>

    <section class="rounded-2xl border-2 border-line bg-surface p-6" aria-labelledby="docs-title">
      <h2 id="docs-title" class="font-display text-h3 text-fg">API hujjatlari</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <a appButton variant="secondary" size="s" icon="link" [href]="backend + '/swagger/admin/'" target="_blank" rel="noopener">Swagger — admin</a>
        <a appButton variant="secondary" size="s" icon="link" [href]="backend + '/swagger/public/'" target="_blank" rel="noopener">Swagger — public</a>
      </div>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-line bg-surface p-6">
      <div class="flex items-center gap-3">
        <span class="flex size-10 items-center justify-center rounded-lg bg-violet-soft text-violet-text"><app-icon name="user" [size]="20" /></span>
        <div>
          <p class="text-body-strong text-fg">Mening hisobim</p>
          <p class="text-caption text-fg-muted">Profil, parol va seanslar</p>
        </div>
      </div>
      <a appButton routerLink="/settings" variant="soft" size="s" icon="arrow-right">Sozlamalarga o'tish</a>
    </section>
  `,
})
export class AdminSettings {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly backend = environment.backendUrl;
  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly sending = signal(false);

  protected async send(): Promise<void> {
    if (!this.title().trim() || this.sending()) return;
    const ok = await this.confirm.ask({
      title: "E'lon yuborish",
      message: "E'lon barcha faol foydalanuvchilarga yuborilsinmi?",
      confirmText: 'Ha, yuborish',
      tone: 'primary',
    });
    if (!ok) return;
    this.sending.set(true);
    this.http
      .post<{ recipients: number }>(apiUrl('/admin/notifications'), { title: this.title().trim(), body: this.body().trim() || null })
      .subscribe({
        next: (r) => {
          this.sending.set(false);
          this.title.set('');
          this.body.set('');
          this.toast.success(`E'lon ${r.recipients} ta foydalanuvchiga yuborildi`);
        },
        error: (err: unknown) => {
          this.sending.set(false);
          this.toast.error(problemMessage(err));
        },
      });
  }
}
