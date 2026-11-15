import { OAuthButtons } from '../oauth-buttons/oauth-buttons';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Button } from '../../../../../shared/ui/button/button';
import { Checkbox } from '../../../../../shared/ui/checkbox/checkbox';
import { Input } from '../../../../../shared/ui/input/input';
import { SignInService } from './sign-in.service';

/** Figma: 02 Kirish — o'ng tomondagi forma. */
@Component({
  selector: 'app-sign-in',
  imports: [OAuthButtons, ReactiveFormsModule, RouterLink, Alert, Button, Checkbox, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.html',
})
export class SignIn {
  private readonly service = inject(SignInService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** /login?returnUrl=/decks — kirgandan keyin shu sahifaga qaytadi. */
  readonly returnUrl = input<string | undefined>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    login: ['', [Validators.required, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  protected readonly remember = signal(true);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { login, password } = this.form.getRawValue();
    this.service.signIn({ login: login.trim(), password }).subscribe({
      next: (session) => {
        this.auth.setSession(session, this.remember());
        void this.router.navigateByUrl(this.safeReturnUrl() ?? (session.role === 'admin' ? '/admin' : '/dashboard'));
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(handleFormError(this.form, err));
      },
    });
  }

  /** Faqat ilova ichidagi manzillarga qaytariladi (open redirect'dan himoya). */
  private safeReturnUrl(): string | null {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : null;
  }
}
