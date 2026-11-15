import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { UpvoteMnemonicService } from './upvote-mnemonic.service';

/** Figma: 07 — eslab qolish usuli yonidagi "▲ 48" ovoz tugmasi (bosilsa ovoz beriladi / qaytariladi). */
@Component({
  selector: 'app-upvote-mnemonic',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      class="flex min-w-10 flex-col items-center rounded-input px-2 py-1.5 text-body-strong transition-colors disabled:opacity-60"
      [class]="voted() ? 'bg-violet text-fg-inverse' : 'bg-surface text-fg hover:bg-muted'"
      [disabled]="busy()"
      [attr.aria-pressed]="voted()"
      [attr.aria-label]="(voted() ? 'Ovozni qaytarish' : 'Foydali deb ovoz berish') + ', ' + count() + ' ta ovoz'"
      (click)="toggle()"
    >
      <app-icon name="chevron-down" [size]="16" class="rotate-180" [class]="voted() ? 'text-fg-inverse' : 'text-mint-text'" />
      {{ count() }}
    </button>
  `,
})
export class UpvoteMnemonic {
  private readonly service = inject(UpvoteMnemonicService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mnemonicId = input.required<number>();
  readonly upvotes = input.required<number>();
  readonly votedByMe = input(false);

  protected readonly count = linkedSignal(() => this.upvotes());
  protected readonly voted = linkedSignal(() => this.votedByMe());
  protected readonly busy = signal(false);

  protected toggle(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const removing = this.voted();
    this.busy.set(true);
    (removing ? this.service.removeUpvote(this.mnemonicId()) : this.service.upvote(this.mnemonicId())).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.count.set(res.upvotes);
        this.voted.set(!removing);
      },
      error: () => this.busy.set(false),
    });
  }
}
