import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/** games moduli: o'yinlar ro'yxati (AppLayout ichida). */
export const GAMES_APP_ROUTES: Routes = [
  {
    path: 'games',
    title: "O'yinlar — So'zchi",
    loadComponent: () => import('./games/public/get-games/get-games').then((m) => m.GetGames),
  },
];

/** games moduli: to'liq ekranli o'yinlar (qobiqsiz, mashq sahifasi kabi). */
export const GAMES_STANDALONE_ROUTES: Routes = [
  {
    path: 'games/speed-round',
    title: "Tezkor raund — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/speed-round/speed-round').then((m) => m.SpeedRound),
  },
  {
    path: 'games/match-pairs',
    title: "Juftini top — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/match-pairs/match-pairs').then((m) => m.MatchPairs),
  },
  {
    path: 'games/crossword',
    title: "Krossvord — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/crossword/crossword').then((m) => m.Crossword),
  },
  {
    path: 'games/scramble',
    title: "Harflarni tartibla — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/scramble/scramble').then((m) => m.Scramble),
  },
  {
    path: 'games/word-search',
    title: "So'z qidirish — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/word-search/word-search').then((m) => m.WordSearch),
  },
  {
    path: 'games/dictation',
    title: "Eshit va yoz — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/dictation/dictation').then((m) => m.Dictation),
  },
  {
    path: 'games/listen-choose',
    title: "Eshit va tanla — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/listen-choose/listen-choose').then((m) => m.ListenChoose),
  },
  {
    path: 'games/true-false',
    title: "To'g'ri yoki noto'g'ri — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/true-false/true-false').then((m) => m.TrueFalse),
  },
  {
    path: 'games/falling-words',
    title: "Tushayotgan so'zlar — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/falling-words/falling-words').then((m) => m.FallingWords),
  },
  {
    path: 'games/balloon-pop',
    title: "Shar otish — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/balloon-pop/balloon-pop').then((m) => m.BalloonPop),
  },
  {
    path: 'games/word-chain',
    title: "So'z zanjiri — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./games/public/word-chain/word-chain').then((m) => m.WordChain),
  },
  {
    // ?mode=random | bot, yoki ?invite=<id> (do'st qabul qilishini kutish)
    path: 'games/duel',
    title: "So'z dueli — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./duels/public/duel-lobby/duel-lobby').then((m) => m.DuelLobby),
  },
  {
    path: 'games/duel/:id',
    title: "So'z dueli — So'zchi",
    canActivate: [authGuard],
    loadComponent: () => import('./duels/public/duel-play/duel-play').then((m) => m.DuelPlay),
  },
];
