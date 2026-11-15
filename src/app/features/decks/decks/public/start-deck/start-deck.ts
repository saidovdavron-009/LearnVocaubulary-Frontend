import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StartDeckResponse } from './start-deck.models';
import { StartDeckService } from './start-deck.service';

/**
 * To'plamni boshlash (POST /api/decks/{id}/start).
 * variant="card" — 08 kartochkasidagi "Qo'shish +"; variant="hero" — 09 dagi "Mashqni boshlash ▷"
 * (boshlagach mashq sahifasiga o'tadi).
 */
@Component({
  selector: 'app-start-deck',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex' },
  template: `
    @if (variant() === 'hero') {
      <button appButton type="button" variant="dark" size="l" icon="play" [loading]="busy()" (click)="start()">
        Mashqni boshlash
      </button>
    } @else {
      <button appButton type="button" variant="soft" size="m" icon="plus" [block]="true" [loading]="busy()" (click)="start()">
        Qo'shish
      </button>
    }
  `,
})
export class StartDeck {
  private readonly service = inject(StartDeckService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly deckId = input.required<number>();
  readonly variant = input<'card' | 'hero'>('card');
  readonly started = output<StartDeckResponse>();

  protected readonly busy = signal(false);

  protected start(): void {
    this.busy.set(true);
    this.service.start(this.deckId()).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.shell.refreshStats();
        this.toast.success(
          res.addedWords > 0 ? `To'plam boshlandi: ${res.addedWords} ta so'z qo'shildi` : "To'plam boshlandi",
        );
        this.started.emit(res);
        if (this.variant() === 'hero') void this.router.navigate(['/study'], { queryParams: { deckId: this.deckId() } });
      },
      error: () => this.busy.set(false),
    });
  }
}
