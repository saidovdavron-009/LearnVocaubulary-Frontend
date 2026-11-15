import { Routes } from '@angular/router';

/** decks moduli: ilova ichi (AppLayout ichida). */
export const DECKS_APP_ROUTES: Routes = [
  {
    path: 'decks',
    title: "To'plamlar — So'zchi",
    loadComponent: () => import('./decks/public/get-all-decks/get-all-decks').then((m) => m.GetAllDecks),
  },
  {
    path: 'decks/:id',
    title: "To'plam — So'zchi",
    loadComponent: () => import('./decks/public/get-one-deck/get-one-deck').then((m) => m.GetOneDeck),
  },
];
