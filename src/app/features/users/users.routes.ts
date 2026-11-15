import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../../core/auth/auth.guards';

/**
 * users moduli. Har bir sahifa alohida lazy yuklanadi; route'lar qaysi qobiqda
 * ochilishiga qarab guruhlangan (app.routes.ts ularni tegishli qobiqqa joylaydi).
 */

/** AuthLayout ichida (chapda brend paneli): kirish va ro'yxatdan o'tish. Faqat mehmon uchun. */
export const USERS_AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: "Kirish — So'zchi",
    loadComponent: () => import('./users/public/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'register',
    title: "Ro'yxatdan o'tish — So'zchi",
    loadComponent: () => import('./users/public/sign-up/sign-up').then((m) => m.SignUp),
  },
];

/** Qobiqsiz to'liq ekran sahifalar. */
export const USERS_STANDALONE_ROUTES: Routes = [
  {
    path: 'forgot-password',
    title: "Parolni tiklash — So'zchi",
    canActivate: [guestGuard],
    loadComponent: () => import('./users/public/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    title: "Yangi parol — So'zchi",
    canActivate: [guestGuard],
    loadComponent: () => import('./users/public/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'verify-email',
    title: "Emailni tasdiqlash — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./users/public/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'onboarding',
    title: "Sozlash — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./users/public/onboarding/onboarding').then((m) => m.Onboarding),
  },
];

/** AppLayout ichida (Sidebar + Topbar). */
export const USERS_APP_ROUTES: Routes = [
  {
    path: 'settings',
    title: "Sozlamalar — So'zchi",
    loadComponent: () => import('./users/public/my-settings/my-settings').then((m) => m.MySettings),
  },
];
