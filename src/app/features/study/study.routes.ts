import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/** study moduli: to'liq ekranli mashq va natija (qobiqsiz). */
export const STUDY_STANDALONE_ROUTES: Routes = [
  {
    path: 'study',
    title: "Mashq — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./sessions/public/study-session/study-session').then((m) => m.StudySession),
  },
  {
    path: 'study/result/:id',
    title: "Natija — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./sessions/public/session-result/session-result').then((m) => m.SessionResult),
  },
];

/** study moduli: ilova ichi (AppLayout ichida). */
export const STUDY_APP_ROUTES: Routes = [
  {
    path: 'my-words',
    title: "Mening so'zlarim — So'zchi",
    loadComponent: () => import('./my-words/public/get-all-my-words/get-all-my-words').then((m) => m.GetAllMyWords),
  },
];
