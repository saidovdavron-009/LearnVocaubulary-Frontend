import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { getProblemDetails, problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { createCountdown } from '../../../../../shared/ui/otp-input/countdown';
import { OtpInput } from '../../../../../shared/ui/otp-input/otp-input';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { VerifyEmailService } from './verify-email.service';

const RESEND_COOLDOWN_SECONDS = 60;

/** Figma: 03 — "Emailingizni tekshiring". Ro'yxatdan o'tgandan keyin ochiladi, so'ng onboarding. */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, Button, Icon, OtpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh items-center justify-center bg-page px-4 py-10' },
  template: `
    <section
      class="flex w-full max-w-130 flex-col items-center rounded-3xl border-2 border-line bg-surface px-6 py-10 text-center shadow-card sm:px-10"
      aria-labelledby="verify-title"
    >
      <span class="flex size-20 items-center justify-center rounded-card bg-mint text-fg shadow-hard shadow-violet-soft-deep">
        <app-icon name="mail" [size]="32" />
      </span>
      <h1 id="verify-title" class="mt-6 font-display text-h2 text-fg">Emailingizni tekshiring</h1>
      <p class="mt-4 text-body text-fg-secondary">
        @if (email()) {
          {{ email() }} manziliga tasdiqlash kodini yubordik.
        } @else {
          Emailingizga tasdiqlash kodini yubordik.
        }
        Quyida 6 xonali kodni kiriting.
      </p>

      <form class="mt-6 flex w-full flex-col items-center gap-5" novalidate (submit)="$event.preventDefault(); verify()">
        <app-otp-input [(value)]="code" [error]="error()" [disabled]="loading()" label="Email tasdiqlash kodi" (completed)="verify()" />
        <button appButton type="submit" size="l" [block]="true" [loading]="loading()" [disabled]="code().length !== 6">
          Tasdiqlash
        </button>
      </form>

      <p class="mt-5 text-body text-fg-secondary">
        Kod kelmadimi?
        <button
          type="button"
          class="text-body-strong text-violet-text hover:underline disabled:text-fg-muted disabled:no-underline"
          [disabled]="resend.running()"
          (click)="resendCode()"
        >
          Qayta yuborish @if (resend.running()) {
            ({{ resend.label() }})
          }
        </button>
      </p>
      <a routerLink="/onboarding" class="mt-3 text-body-strong text-fg-muted hover:text-fg">Keyinroq tasdiqlash</a>
    </section>
  `,
})
export class VerifyEmail {
  private readonly service = inject(VerifyEmailService);
  private readonly shell = inject(AppShellService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Sign-up sahifasidan router state orqali keladi; bo'lmasa profildan olinadi. */
  private readonly stateEmail = (this.router.currentNavigation()?.extras.state?.['email'] as string | undefined) ?? null;

  protected readonly email = computed(() => this.stateEmail ?? this.shell.profile()?.email ?? null);
  protected readonly code = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly resend = createCountdown();
  /** Shu sahifada tasdiqlangan bo'lsa onboarding'ga o'tamiz, dashboard'ga emas. */
  private verifiedHere = false;

  constructor() {
    this.shell.refreshProfile();
    // Sign-up'dan hozirgina kelgan bo'lsak, kod hozir yuborilgan.
    if (this.stateEmail) this.resend.start(RESEND_COOLDOWN_SECONDS);

    // Email allaqachon tasdiqlangan bo'lsa bu sahifa kerak emas.
    effect(() => {
      if (this.shell.profile()?.isEmailVerified && !this.verifiedHere) void this.router.navigate(['/dashboard']);
    });
  }

  protected verify(): void {
    if (this.loading()) return;
    if (this.code().length !== 6) {
      this.error.set('6 xonali kodni kiriting');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.service.verify({ code: this.code() }).subscribe({
      next: () => {
        this.verifiedHere = true;
        this.toast.success('Email tasdiqlandi');
        this.shell.refreshProfile();
        void this.router.navigate(['/onboarding']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.code.set('');
        const codeProblem = getProblemDetails(err)?.errors?.find((e) => e.name.toLowerCase() === 'code');
        this.error.set(codeProblem?.reason ?? problemMessage(err));
      },
    });
  }

  protected resendCode(): void {
    if (this.resend.running()) return;
    this.service.resend().subscribe({
      next: (res) => {
        this.code.set('');
        this.error.set(null);
        this.resend.start((Date.parse(res.resendAvailableAt) - Date.now()) / 1000);
        this.toast.success('Yangi kod yuborildi');
      },
      error: (err: unknown) => this.toast.error(problemMessage(err)),
    });
  }
}
