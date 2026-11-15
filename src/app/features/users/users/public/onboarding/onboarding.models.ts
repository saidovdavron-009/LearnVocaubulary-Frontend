import { CefrLevel, OAuthProvider, UserRole } from '../../../../../core/api/enums';

/** Swagger: GET /api/languages → GetAllLanguagesResponse */
export interface OnboardingLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}

/** Swagger: GET /api/profile/me → GetMyProfileResponse */
export interface OnboardingProfile {
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

/** Swagger: GET /api/profile/me/settings → GetMySettingsResponse */
export interface OnboardingSettings {
  learningLanguageId: number | null;
  learningLanguageCode: string | null;
  /** Backend "A2" yoki "a2" ko'rinishida qaytarishi mumkin. */
  cefrLevel: string | null;
  dailyGoalWords: number;
  newWordsPerDay: number;
  reminderEnabled: boolean;
  /** "HH:mm:ss" */
  reminderTime: string | null;
  soundEnabled: boolean;
  telegramConnected: boolean;
  updatedAt: string;
}

/** Swagger: PUT /api/profile/me → UpdateMyProfileRequest */
export interface UpdateProfileRequest {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  nativeLanguageId?: number | null;
  timezone: string;
}

/** Swagger: PUT /api/profile/me/settings → UpdateMySettingsRequest */
export interface UpdateSettingsRequest {
  learningLanguageId?: number | null;
  cefrLevel?: CefrLevel | null;
  dailyGoalWords: number;
  newWordsPerDay: number;
  reminderEnabled: boolean;
  reminderTime?: string | null;
  soundEnabled: boolean;
}
