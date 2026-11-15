import { Routes } from '@angular/router';

/** words moduli: ilova ichi (AppLayout ichida). */
export const WORDS_APP_ROUTES: Routes = [
  {
    path: 'vocabulary',
    title: "Lug'at — So'zchi",
    loadComponent: () => import('./words/public/get-all-words/get-all-words').then((m) => m.GetAllWords),
  },
  {
    path: 'words/:id',
    title: "So'z — So'zchi",
    loadComponent: () => import('./words/public/get-one-word/get-one-word').then((m) => m.GetOneWord),
  },
];
