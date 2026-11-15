import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Observable, shareReplay, tap, map, catchError, of } from 'rxjs';
import { apiUrl } from '../api/api-url';
import { AuthSession, RefreshTokenRequest, RefreshTokenResponse } from './auth.models';
import { readSession, writeSession } from './session-storage';

export const REFRESH_URL = apiUrl('/auth/refresh');
const SIGN_OUT_URL = apiUrl('/auth/sign-out');

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly stored = readSession();
  private readonly sessionState = signal<AuthSession | null>(this.stored?.session ?? null);
  /** "Meni eslab qol" tanlovi — refresh'dan keyin ham shu joyga yoziladi. */
  private remember = this.stored?.remember ?? true;
  private refreshInFlight$: Observable<string> | null = null;

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly isAdmin = computed(() => this.sessionState()?.role === 'admin');
  readonly username = computed(() => this.sessionState()?.username ?? null);

  accessToken(): string | null {
    return this.sessionState()?.accessToken ?? null;
  }

  /** Sign-in / sign-up / OAuth / admin sign-in javobidan keyin chaqiriladi. */
  setSession(session: AuthSession, remember = this.remember): void {
    this.remember = remember;
    this.sessionState.set(session);
    writeSession({ session, remember });
  }

  clearSession(): void {
    this.sessionState.set(null);
    writeSession(null);
  }

  /**
   * Access tokenni yangilaydi. Bir vaqtda bir nechta 401 kelsa ham backend'ga
   * faqat bitta so'rov yuboriladi — qolganlari shu natijani kutadi.
   */
  refresh(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const current = this.sessionState();
    if (!current) {
      return new Observable<string>((s) => s.error(new Error('Seans mavjud emas')));
    }

    const body: RefreshTokenRequest = { refreshToken: current.refreshToken };
    this.refreshInFlight$ = this.http.post<RefreshTokenResponse>(REFRESH_URL, body).pipe(
      tap((tokens) => {
        const session = this.sessionState();
        if (session) this.setSession({ ...session, ...tokens });
      }),
      map((tokens) => tokens.accessToken),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight$;
  }

  /** Backend'dagi seansni yopadi va kirish sahifasiga qaytaradi. */
  signOut(): Observable<void> {
    return this.http.post<void>(SIGN_OUT_URL, null).pipe(
      catchError(() => of(undefined)),
      tap(() => this.endSession()),
    );
  }

  /** Seansni tozalab, kirish sahifasiga yuboradi (refresh muvaffaqiyatsiz bo'lganda ham). */
  endSession(returnUrl?: string): void {
    this.clearSession();
    void this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : undefined,
    });
  }
}
