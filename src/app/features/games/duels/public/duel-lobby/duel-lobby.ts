import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, Subscription, switchMap, timer } from 'rxjs';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { DuelGame, DuelInvite, GamesService } from '../../../games.service';

/** Shuncha soniya raqib topilmasa — bot bilan o'ynash taklif qilinadi. */
const BOT_OFFER_AFTER = 12;

type Phase = 'starting' | 'searching' | 'waiting-friend' | 'invite-closed' | 'error';

/**
 * Duel kutish zali. ?mode=random — tasodifiy raqib qidiriladi, ?mode=bot — darhol bot bilan,
 * ?invite=<id> — do'st chaqiruvni qabul qilishi kutiladi. Raqib topilgach /games/duel/:id ga o'tiladi.
 */
@Component({
  selector: 'app-duel-lobby',
  imports: [Avatar, Button, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-ink text-fg-inverse' },
  template: `
    <header class="flex items-center gap-3 px-4 py-4 md:px-12 md:py-6">
      <button
        type="button"
        class="flex size-12 shrink-0 items-center justify-center rounded-input border-2 border-fg-inverse/15 text-fg-inverse transition-colors hover:bg-fg-inverse/10"
        aria-label="Bekor qilish"
        (click)="cancel()"
      >
        <app-icon name="x" [size]="22" />
      </button>
      <span class="font-display text-h3">{{ gameTitle() }}</span>
    </header>

    <main class="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16 text-center">
      @switch (phase()) {
        @case ('starting') {
          <span class="size-12 animate-spin rounded-full border-4 border-yellow border-r-transparent" role="status" aria-label="Yuklanmoqda"></span>
        }
        @case ('searching') {
          <div class="relative flex size-56 items-center justify-center" aria-hidden="true">
            <span class="absolute inset-0 animate-ping rounded-full bg-violet/30 [animation-duration:2s]"></span>
            <span class="absolute inset-6 animate-ping rounded-full bg-violet/30 [animation-delay:0.6s] [animation-duration:2s]"></span>
            <span class="relative flex size-32 items-center justify-center rounded-full bg-violet shadow-[0_8px_0_0_var(--color-violet-deep)]">
              <app-icon name="search" [size]="52" />
            </span>
          </div>
          <div class="flex flex-col gap-2" role="status" aria-live="polite">
            <h1 class="font-display text-h1">Raqib qidirilmoqda...</h1>
            <p class="text-body-lg text-line-strong">{{ waited() }} soniya · o'yinchi topilishi bilan duel boshlanadi</p>
          </div>
          @if (waited() >= botOfferAfter) {
            <div class="fade-in flex w-full max-w-100 flex-col gap-3">
              <p class="text-body text-line-strong">Hozir onlayn raqib kam. Kutishda davom eting yoki bot bilan o'ynang.</p>
              <button appButton type="button" variant="yellow" size="l" icon="play" [block]="true" [loading]="botStarting()" (click)="playBot()">
                Bot bilan o'ynash
              </button>
            </div>
          }
          <button appButton type="button" variant="dark" size="m" (click)="cancel()">Qidirishni to'xtatish</button>
        }
        @case ('waiting-friend') {
          @if (invite(); as inv) {
            <div class="flex items-center gap-6">
              <app-avatar [name]="inv.toName" [size]="96" />
            </div>
            <div class="flex flex-col gap-2" role="status" aria-live="polite">
              <h1 class="font-display text-h1">{{ inv.toName }} kutilmoqda...</h1>
              <p class="text-body-lg text-line-strong">Chaqiruv yuborildi. Do'stingiz qabul qilishi bilan duel boshlanadi.</p>
              <p class="font-display text-h2 text-yellow">{{ inviteSecondsLeft() }} s</p>
            </div>
            <button appButton type="button" variant="dark" size="m" (click)="cancel()">Chaqiruvni bekor qilish</button>
          }
        }
        @case ('invite-closed') {
          <span class="flex size-24 items-center justify-center rounded-full bg-fg-inverse/10" aria-hidden="true">
            <app-icon name="clock" [size]="44" />
          </span>
          <div class="flex flex-col gap-2">
            <h1 class="font-display text-h2">{{ closedText() }}</h1>
            <p class="text-body-lg text-line-strong">Boshqa do'stni chaqirishingiz yoki tasodifiy raqib bilan o'ynashingiz mumkin.</p>
          </div>
          <div class="flex w-full max-w-100 flex-col gap-3">
            <button appButton type="button" variant="yellow" size="l" icon="search" [block]="true" (click)="searchAgain()">Raqib topish</button>
            <a appButton routerLink="/games" variant="dark" size="m" [block]="true">O'yinlarga qaytish</a>
          </div>
        }
        @case ('error') {
          <div class="flex flex-col gap-2">
            <h1 class="font-display text-h2">Duelni boshlab bo'lmadi</h1>
            <p class="text-body-lg text-line-strong">{{ error() }}</p>
          </div>
          <a appButton routerLink="/games" variant="yellow" size="l">O'yinlarga qaytish</a>
        }
      }
    </main>
  `,
})
export class DuelLobby implements OnInit {
  private readonly service = inject(GamesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shell = inject(AppShellService);

  readonly mode = input<string>();
  /** quiz (standart) yoki pairs. */
  readonly gameParam = input<string>(undefined, { alias: 'game' });
  protected readonly game = computed<DuelGame>(() => {
    const g = this.gameParam();
    return g === 'pairs' || g === 'listen' ? g : 'quiz';
  });
  protected readonly gameTitle = computed(() =>
    this.game() === 'pairs' ? 'Juftini top · 1v1' : this.game() === 'listen' ? 'Eshit va tanla · 1v1' : "So'z dueli",
  );
  /** Do'stga yuborilgan chaqiruv id'si. */
  readonly inviteId = input<string>(undefined, { alias: 'invite' });

  protected readonly botOfferAfter = BOT_OFFER_AFTER;
  protected readonly phase = signal<Phase>('starting');
  protected readonly waited = signal(0);
  protected readonly botStarting = signal(false);
  protected readonly invite = signal<DuelInvite | null>(null);
  protected readonly inviteSecondsLeft = signal(0);
  protected readonly closedText = signal('');
  protected readonly error = signal<string | null>(null);

  private poll: Subscription | null = null;
  private matched = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.poll?.unsubscribe();
      // Sahifadan chiqib ketilsa — navbatdan ham chiqamiz (chaqiruv o'z muddatida tugaydi).
      if (!this.matched && this.phase() === 'searching') this.service.leaveQueue().subscribe({ error: () => undefined });
    });
  }

  ngOnInit(): void {
    if (!this.shell.profile()) this.shell.loadAll();
    const inviteId = this.inviteId();
    if (inviteId) this.waitForFriend(inviteId);
    else if (this.mode() === 'bot') this.playBot();
    else this.search();
  }

  private search(): void {
    this.service.joinQueue(this.game()).subscribe({
      next: (r) => {
        if (r.status === 'matched' && r.duelId) return this.go(r.duelId);
        this.phase.set('searching');
        this.poll = timer(1000, 1000)
          .pipe(switchMap(() => this.service.pollQueue().pipe(catchError(() => of(null)))))
          .subscribe((q) => {
            if (!q) return;
            if (q.status === 'matched' && q.duelId) this.go(q.duelId);
            else if (q.status === 'searching') this.waited.set(q.waitedSeconds);
            // idle — navbatdan tushib qolgan (masalan, tarmoq uzilgan): qayta qo'shilamiz.
            else this.service.joinQueue(this.game()).subscribe({ error: () => undefined });
          });
      },
      error: (err: unknown) => this.fail(err),
    });
  }

  /** Chaqiruv yopilgach — shu sahifada tasodifiy raqib qidirishga o'tamiz. */
  protected searchAgain(): void {
    this.invite.set(null);
    this.phase.set('starting');
    this.search();
  }

  protected playBot(): void {
    this.botStarting.set(true);
    this.service.startBot(this.game()).subscribe({
      next: (r) => r.duelId && this.go(r.duelId),
      error: (err: unknown) => {
        this.botStarting.set(false);
        this.fail(err);
      },
    });
  }

  private waitForFriend(id: string): void {
    this.poll = timer(0, 1500)
      .pipe(switchMap(() => this.service.inviteStatus(id).pipe(catchError(() => of(null)))))
      .subscribe((inv) => {
        if (!inv) {
          this.close("Chaqiruv topilmadi");
          return;
        }
        this.invite.set(inv);
        this.inviteSecondsLeft.set(Math.max(0, Math.round((new Date(inv.expiresAt).getTime() - Date.now()) / 1000)));
        switch (inv.status) {
          case 'pending':
            this.phase.set('waiting-friend');
            break;
          case 'accepted':
            if (inv.duelId) this.go(inv.duelId);
            break;
          case 'declined':
            this.close(`${inv.toName} chaqiruvni rad etdi`);
            break;
          case 'expired':
            this.close(`${inv.toName} javob bermadi`);
            break;
          default:
            this.close('Chaqiruv bekor qilindi');
        }
      });
  }

  private close(text: string): void {
    this.poll?.unsubscribe();
    this.closedText.set(text);
    this.phase.set('invite-closed');
  }

  protected cancel(): void {
    this.poll?.unsubscribe();
    const inv = this.invite();
    if (this.phase() === 'waiting-friend' && inv) this.service.declineInvite(inv.id).subscribe({ error: () => undefined });
    if (this.phase() === 'searching') {
      this.phase.set('starting');
      this.service.leaveQueue().subscribe({ error: () => undefined });
    }
    void this.router.navigate(['/games']);
  }

  private go(duelId: string): void {
    this.matched = true;
    this.poll?.unsubscribe();
    void this.router.navigate(['/games/duel', duelId], { replaceUrl: true });
  }

  private fail(err: unknown): void {
    this.poll?.unsubscribe();
    this.error.set(problemMessage(err));
    this.phase.set('error');
  }
}
