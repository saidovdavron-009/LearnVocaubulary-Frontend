import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { AddMyWordService } from './add-my-word.service';

/**
 * "Qo'shish +" / "✓ Qo'shilgan" tugmasi (06 Lug'at kartochkalari) va
 * "So'zlarimga qo'shish +" (kunning so'zi banneri). POST /api/my-words.
 */
@Component({
  selector: 'app-add-my-word',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (added()) {
      <span
        class="inline-flex items-center gap-1.5 rounded-md bg-mint-soft font-extrabold text-mint-text"
        [class]="variant() === 'banner' ? 'h-14 px-6 text-button' : 'h-9 px-3.5 text-label'"
        role="status"
      >
        <app-icon name="check" [size]="variant() === 'banner' ? 20 : 16" /> Qo'shilgan
      </span>
    } @else if (variant() === 'banner') {
      <button appButton type="button" variant="dark" size="l" icon="plus" [loading]="busy()" (click)="add()">
        So'zlarimga qo'shish
      </button>
    } @else {
      <button
        appButton
        type="button"
        variant="soft"
        size="s"
        icon="plus"
        [loading]="busy()"
        [attr.aria-label]="label() ? label() + ' so‘zini qo‘shish' : null"
        (click)="add()"
      >
        Qo'shish
      </button>
    }
  `,
})
export class AddMyWord {
  private readonly service = inject(AddMyWordService);
  private readonly auth = inject(AuthService);
  private readonly shell = inject(AppShellService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly wordId = input.required<number>();
  /** So'z matni — ekran o'quvchilar uchun. */
  readonly label = input<string | null>(null);
  readonly variant = input<'card' | 'banner'>('card');
  /** So'z allaqachon ro'yxatda bo'lsa (backend: isInMyWords). */
  readonly initiallyAdded = input(false, { alias: 'added' });
  readonly addedChange = output<number>();

  protected readonly added = linkedSignal(() => this.initiallyAdded());
  protected readonly busy = signal(false);

  protected add(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.busy.set(true);
    this.service.add({ wordId: this.wordId() }).subscribe({
      next: () => this.done(),
      error: (err: unknown) => {
        this.busy.set(false);
        // 409 — so'z allaqachon ro'yxatda: holatni "Qo'shilgan" qilib ko'rsatamiz.
        if (err instanceof HttpErrorResponse && err.status === 409) this.done(false);
        else this.toast.error(problemMessage(err));
      },
    });
  }

  private done(notify = true): void {
    this.busy.set(false);
    this.added.set(true);
    this.addedChange.emit(this.wordId());
    if (notify) {
      this.toast.success("So'z mening so'zlarimga qo'shildi");
      this.shell.refreshStats();
    }
  }
}
