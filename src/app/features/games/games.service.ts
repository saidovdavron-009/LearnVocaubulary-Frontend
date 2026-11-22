import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { PaginatedResponse } from '../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../core/interceptors/http-context';

export type GameType =
  | 'duel'
  | 'speed_round'
  | 'match_pairs'
  | 'pairs_duel'
  | 'crossword'
  | 'scramble'
  | 'word_search'
  | 'dictation'
  | 'listen_choose'
  | 'true_false'
  | 'falling_words'
  | 'balloon_pop'
  | 'categories'
  | 'word_chain'
  | 'picture_match'
  | 'listen_duel';
/** Natijasi frontenddan yuboriladigan yakka o'yinlar. */
export type SoloGameType = Exclude<GameType, 'duel' | 'pairs_duel' | 'listen_duel'>;
/** Duel turi: quiz — So'z dueli, pairs — Juftini top (navbatma-navbat). */
export type DuelGame = 'quiz' | 'pairs' | 'listen';
export type GameOutcome = 'win' | 'loss' | 'draw';

/** Swagger: GetGamesSummaryResponse */
export interface GameStats {
  gameType: GameType;
  played: number;
  bestScore: number;
  wins: number;
  losses: number;
  draws: number;
  totalXp: number;
}

export interface GamesSummary {
  games: GameStats[];
  xpToday: number;
  dailyXpCap: number;
}

/** Swagger: GameWord */
export interface GameWord {
  wordId: number;
  text: string;
  transcription: string | null;
  translations: string[];
  distractors: string[];
}

/** Swagger: DictionaryWord — So'z zanjiri uchun lug'at. */
export interface DictionaryWord {
  text: string;
  translation: string;
  /** Userning darajasida yoki pastroq. */
  inLevel: boolean;
}

/** Swagger: SubmitGameResultResponse */
export interface GameResultSaved {
  xpEarned: number;
  dailyCapReached: boolean;
  bestScore: number;
  isNewRecord: boolean;
  totalXp: number;
  level: number;
}

export type DuelQueueStatus = 'idle' | 'searching' | 'matched';

export interface DuelQueue {
  status: DuelQueueStatus;
  duelId: string | null;
  waitedSeconds: number;
}

export type DuelInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface DuelInvite {
  id: string;
  game: DuelGame;
  fromUserId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  fromLevel: number;
  toUserId: string;
  toName: string;
  status: DuelInviteStatus;
  duelId: string | null;
  createdAt: string;
  expiresAt: string;
}

export type DuelPhase = 'countdown' | 'playing' | 'finished';

export interface DuelPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  level: number;
  isBot: boolean;
  score: number;
  correctCount: number;
  answeredCount: number;
  left: boolean;
  answers: boolean[];
}

export interface DuelQuestion {
  index: number;
  text: string;
  transcription: string | null;
  options: string[];
}

export interface PairsCard {
  index: number;
  side: 'en' | 'uz';
  text: string | null;
  faceUp: boolean;
  matched: boolean;
  matchedByMe: boolean | null;
}

export interface PairsState {
  cards: PairsCard[];
  myTurn: boolean;
  turnEndsAt: string;
  holdUntil: string | null;
  pairCount: number;
}

export interface DuelState {
  id: string;
  game: DuelGame;
  pairs: PairsState | null;
  phase: DuelPhase;
  serverTime: string;
  startsAt: string;
  endsAt: string;
  questionCount: number;
  me: DuelPlayer;
  opponent: DuelPlayer;
  question: DuelQuestion | null;
  outcome: GameOutcome | null;
  xpEarned: number | null;
  review: { text: string; correctOption: string; myAnswerCorrect: boolean | null }[];
}

export interface DuelAnswer {
  accepted: boolean;
  isCorrect: boolean;
  correctIndex: number;
  points: number;
  state: DuelState;
}

/** Swagger: GetAllFriendsResponse (o'yin uchun kerakli qismi) */
export interface GameFriend {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
}

/**
 * O'yinlar API. Duel holati har ~1 soniyada so'raladi (polling) — bu so'rovlar xatoda toast chiqarmaydi,
 * sahifaning o'zi holatni ko'rsatadi.
 */
@Injectable({ providedIn: 'root' })
export class GamesService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  summary(): Observable<GamesSummary> {
    return this.http.get<GamesSummary>(apiUrl('/games/summary'), { context: this.quiet });
  }

  words(count: number): Observable<GameWord[]> {
    return this.http.get<GameWord[]>(apiUrl('/games/words'), { params: { count } });
  }

  dictionary(): Observable<DictionaryWord[]> {
    return this.http.get<DictionaryWord[]>(apiUrl('/games/dictionary'));
  }

  submitResult(body: {
    gameType: SoloGameType;
    score: number;
    correctCount: number;
    wrongCount: number;
    durationMs: number;
  }): Observable<GameResultSaved> {
    return this.http.post<GameResultSaved>(apiUrl('/games/results'), body);
  }

  friends(): Observable<GameFriend[]> {
    return this.http
      .get<PaginatedResponse<GameFriend>>(apiUrl('/friends'), { params: { page: 1, pageSize: 100 }, context: this.quiet })
      .pipe(map((r) => r.data));
  }

  // ---------- Duel: raqib qidirish ----------

  joinQueue(game: DuelGame): Observable<DuelQueue> {
    return this.http.post<DuelQueue>(apiUrl('/games/duels/queue'), { game });
  }

  pollQueue(): Observable<DuelQueue> {
    return this.http.get<DuelQueue>(apiUrl('/games/duels/queue'), { context: this.quiet });
  }

  leaveQueue(): Observable<unknown> {
    return this.http.delete(apiUrl('/games/duels/queue'), { context: this.quiet });
  }

  startBot(game: DuelGame): Observable<DuelQueue> {
    return this.http.post<DuelQueue>(apiUrl('/games/duels/bot'), { game });
  }

  // ---------- Duel: do'stni chaqirish ----------

  invite(friendId: string, game: DuelGame): Observable<DuelInvite> {
    return this.http.post<DuelInvite>(apiUrl('/games/duels/invites'), { friendId, game });
  }

  incomingInvites(): Observable<DuelInvite[]> {
    return this.http.get<DuelInvite[]>(apiUrl('/games/duels/invites'), { context: this.quiet });
  }

  inviteStatus(id: string): Observable<DuelInvite> {
    return this.http.get<DuelInvite>(apiUrl(`/games/duels/invites/${id}`), { context: this.quiet });
  }

  acceptInvite(id: string): Observable<DuelQueue> {
    return this.http.post<DuelQueue>(apiUrl(`/games/duels/invites/${id}/accept`), {});
  }

  declineInvite(id: string): Observable<unknown> {
    return this.http.post(apiUrl(`/games/duels/invites/${id}/decline`), {}, { context: this.quiet });
  }

  // ---------- Duel: o'yin ----------

  duel(id: string): Observable<DuelState> {
    return this.http.get<DuelState>(apiUrl(`/games/duels/${id}`), { context: this.quiet });
  }

  answer(id: string, questionIndex: number, optionIndex: number): Observable<DuelAnswer> {
    return this.http.post<DuelAnswer>(apiUrl(`/games/duels/${id}/answers`), { questionIndex, optionIndex }, { context: this.quiet });
  }

  flip(id: string, cardIndex: number): Observable<{ result: 'not_your_turn' | 'invalid' | 'opened' | 'matched' | 'mismatched'; state: DuelState }> {
    return this.http.post<{ result: 'not_your_turn' | 'invalid' | 'opened' | 'matched' | 'mismatched'; state: DuelState }>(
      apiUrl(`/games/duels/${id}/flip`),
      { cardIndex },
      { context: this.quiet },
    );
  }

  leave(id: string): Observable<DuelState> {
    return this.http.post<DuelState>(apiUrl(`/games/duels/${id}/leave`), {}, { context: this.quiet });
  }
}

/** Massivni aralashtiradi (yangi massiv). */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
