import { LevelUp } from '../../../../../core/api/cefr';
import { CefrLevel, PartOfSpeech, WordStatus } from '../../../../../core/api/enums';

/** Swagger: GET /api/stats/me → GetMyStatsResponse */
export interface DashboardStats {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakAtRisk: boolean;
  totalWordsLearned: number;
  totalReviews: number;
  achievementsEarned: number;
  today: {
    date: string;
    newWords: number;
    reviews: number;
    xp: number;
    minutesSpent: number;
    dailyGoal: number;
    goalReached: boolean;
  };
  words: {
    total: number;
    new: number;
    learning: number;
    review: number;
    mastered: number;
    due: number;
  };
}

/** Swagger: GetMyActivityResponse_Day */
export interface DashboardActivityDay {
  date: string;
  newWords: number;
  reviews: number;
  xp: number;
  minutesSpent: number;
}

/** Swagger: GET /api/stats/me/activity → GetMyActivityResponse */
export interface DashboardActivity {
  from: string;
  to: string;
  activeDays: number;
  totalXp: number;
  totalReviews: number;
  days: DashboardActivityDay[];
}

/** Swagger: GetStudyQueueResponse_Item */
export interface DashboardQueueItem {
  wordId: number;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  audioUrl: string | null;
  imageUrl: string | null;
  translations: string[];
  exampleSentence: string | null;
  exampleTranslation: string | null;
  status: WordStatus;
  isNew: boolean;
  nextReviewAt: string | null;
}

/** Swagger: GET /api/study/queue → GetStudyQueueResponse */
export interface DashboardQueue {
  dueCount: number;
  newCount: number;
  newRemainingToday: number;
  /** Navbat shu daraja bo'yicha filtrlangan (null — daraja tanlanmagan). */
  cefrLevel: string | null;
  levelTotal: number;
  levelLearned: number;
  /** Navbat olinishidan oldin daraja tugatilgan bo'lsa — keyingi darajaga o'tish. */
  levelUp: LevelUp | null;
  items: DashboardQueueItem[];
}

/** Swagger: GET /api/decks → GetAllDecksResponse */
export interface DashboardDeck {
  id: number;
  title: string;
  description: string | null;
  languageCode: string;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  isPublic: boolean;
  ownerUsername: string | null;
  isMine: boolean;
  wordsCount: number;
  learnersCount: number;
  isStarted: boolean;
  /** O'zlashtirilgan so'zlar foizi (0–100). */
  progress: number;
}

/** Swagger: GET /api/leaderboard → GetLeaderboardResponse */
export interface DashboardLeader {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  isMe: boolean;
}

/** Swagger: GET /api/study/sessions → GetAllSessionsResponse */
export interface DashboardSession {
  id: number;
  startedAt: string;
  endedAt: string | null;
  isFinished: boolean;
  durationSeconds: number;
  wordsStudied: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercent: number;
  xpEarned: number;
}
