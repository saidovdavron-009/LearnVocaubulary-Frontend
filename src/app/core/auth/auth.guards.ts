import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard'lar canActivate / canActivateChild sifatida ishlatiladi: route avval
 * URL bo'yicha tanlanadi, keyin ruxsat tekshiriladi. Shu tufayli mehmon "/" ga
 * kirganda ilova qobig'i emas, ochiq sahifa ochiladi.
 */

/** Faqat tizimga kirgan user uchun. Aks holda /login?returnUrl=... */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Faqat tizimga kirmagan user uchun (kirish, ro'yxatdan o'tish, parolni tiklash). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree([auth.isAdmin() ? '/admin' : '/dashboard']);
};

/** Faqat "admin" roli uchun. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAdmin()) return true;
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return router.createUrlTree(['/dashboard']);
};
