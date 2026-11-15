import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';
import { ADMIN_ROUTES } from './features/admin/admin.routes';
import { AdminLayout } from './core/layout/admin-layout';
import { AppLayout } from './core/layout/app-layout';
import { AuthLayout } from './core/layout/auth-layout';
import { PublicLayout } from './core/layout/public-layout';
import { COMMON_APP_ROUTES, COMMON_PUBLIC_ROUTES } from './features/common/common.routes';
import { DECKS_APP_ROUTES } from './features/decks/decks.routes';
import { GAMIFICATION_APP_ROUTES } from './features/gamification/gamification.routes';
import { SOCIAL_APP_ROUTES } from './features/social/social.routes';
import { STUDY_APP_ROUTES, STUDY_STANDALONE_ROUTES } from './features/study/study.routes';
import { WORDS_APP_ROUTES } from './features/words/words.routes';
import { USERS_APP_ROUTES, USERS_AUTH_ROUTES, USERS_STANDALONE_ROUTES } from './features/users/users.routes';

/**
 * Qobiqlar va guard'lar. Har bir modul o'z routes faylida sahifalarini e'lon qiladi
 * (loadComponent — har sahifa alohida chunk), bu yerda ular tegishli qobiqqa joylanadi.
 */
export const routes: Routes = [
  // VAQTINCHALIK: dizayn tizimi sahifasi (3-bosqich). Admin panel tayyor bo'lgach o'chiriladi.
  {
    path: 'ui-kit',
    loadComponent: () => import('./shared/ui/ui-kit/ui-kit-page').then((m) => m.UiKitPage),
  },

  // Admin panel — faqat admin roli
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: ADMIN_ROUTES,
  },

  // Ochiq sahifalar — Header + Footer.
  // Birinchi turadi: qobiqli '' route'lar orasida "/" faqat shu yerdagi aniq '' bolaga mos keladi
  // (aks holda Angular "/" uchun bolasi topilmagan boshqa qobiqni bo'sh holda ochib qo'yadi).
  {
    path: '',
    component: PublicLayout,
    children: [...COMMON_PUBLIC_ROUTES],
  },

  // Kirish / ro'yxatdan o'tish — brend paneli bilan, faqat mehmon uchun
  {
    path: '',
    component: AuthLayout,
    canActivateChild: [guestGuard],
    children: USERS_AUTH_ROUTES,
  },

  // Qobiqsiz sahifalar (parolni tiklash, email tasdiqlash, onboarding)
  ...USERS_STANDALONE_ROUTES,
  ...STUDY_STANDALONE_ROUTES,

  // Ilova ichi — Sidebar + Topbar, faqat tizimga kirgan user.
  // Bolalar aniq yo'llarga ega (dashboard, settings, ...), shuning uchun "/" bu yerga tushmaydi.
  {
    path: '',
    component: AppLayout,
    canActivateChild: [authGuard],
    children: [...COMMON_APP_ROUTES, ...WORDS_APP_ROUTES, ...DECKS_APP_ROUTES, ...STUDY_APP_ROUTES, ...GAMIFICATION_APP_ROUTES, ...SOCIAL_APP_ROUTES, ...USERS_APP_ROUTES],
  },

  { path: '**', redirectTo: '' },
];
