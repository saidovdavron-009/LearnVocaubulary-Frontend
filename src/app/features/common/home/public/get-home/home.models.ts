import { CefrLevel, PartOfSpeech, WordStatus } from '../../../../../core/api/enums';

/** Swagger: GET /api/words/word-of-the-day → GetWordOfTheDayResponse */
export interface HomeWordOfTheDay {
  date: string;
  id: number;
  languageCode: string;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  primaryTranslation: string | null;
  exampleSentence: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

/** Swagger: GET /api/categories → GetAllCategoriesResponse */
export interface HomeCategory {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  icon: string | null;
  hasChildren: boolean;
  /** Nashr qilingan so'zlar soni. */
  wordsCount: number;
}

/** Swagger: GET /api/decks → GetAllDecksResponse */
export interface HomeDeck {
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
  progress: number;
}

/** Swagger: GET /api/stats/me → GetMyStatsResponse */
export interface HomeStats {
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

/** Swagger: GET /api/stats/me/activity → GetMyActivityResponse */
export interface HomeActivity {
  from: string;
  to: string;
  activeDays: number;
  totalXp: number;
  totalReviews: number;
  days: { date: string; newWords: number; reviews: number; xp: number; minutesSpent: number }[];
}

/** Swagger: GET /api/my-words → GetAllMyWordsResponse */
export interface HomeMyWord {
  wordId: number;
  languageCode: string;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  primaryTranslation: string | null;
  audioUrl: string | null;
  status: WordStatus;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  isFavorite: boolean;
  createdAt: string;
}

/** Swagger: GET /api/leaderboard → GetLeaderboardResponse */
export interface HomeLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  isMe: boolean;
}

/** Swagger: GET /api/achievements/me → GetMyAchievementsResponse */
export interface HomeAchievements {
  earnedCount: number;
  totalCount: number;
  items: {
    id: number;
    code: string;
    title: string;
    description: string | null;
    iconUrl: string | null;
    xpReward: number;
    conditionType: string;
    conditionValue: number;
    progress: number;
    isEarned: boolean;
    earnedAt: string | null;
  }[];
}
