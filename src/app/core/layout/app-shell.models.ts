import { OAuthProvider, UserRole } from '../api/enums';

/** Swagger: GET /api/profile/me → GetMyProfileResponse */
export interface ShellProfile {
  id: string;
  email: string;
  isEmailVerified: boolean;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  nativeLanguageId: number | null;
  nativeLanguageCode: string | null;
  timezone: string | null;
  hasPassword: boolean;
  linkedProviders: OAuthProvider[];
  createdAt: string;
  lastLoginAt: string | null;
}

/** Swagger: GetMyStatsResponse_TodayStats */
export interface ShellTodayStats {
  date: string;
  newWords: number;
  reviews: number;
  xp: number;
  minutesSpent: number;
  dailyGoal: number;
  goalReached: boolean;
}

/** Swagger: GetMyStatsResponse_WordCounts */
export interface ShellWordCounts {
  total: number;
  new: number;
  learning: number;
  review: number;
  mastered: number;
  due: number;
}

/** Swagger: GET /api/stats/me → GetMyStatsResponse */
export interface ShellStats {
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
  today: ShellTodayStats;
  words: ShellWordCounts;
}

/** Swagger: GET /api/notifications/unread-count → GetUnreadCountResponse */
export interface ShellUnreadCount {
  count: number;
}
