import { CefrLevel } from '../../../../../core/api/enums';

/** Swagger: GET /api/profile/me/settings → GetMySettingsResponse */
export interface MySettings {
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

/** Swagger: PUT /api/profile/me/settings → UpdateMySettingsRequest */
export interface UpdateMySettingsRequest {
  learningLanguageId?: number | null;
  /** Hozirgi daraja (A1–C2). */
  cefrLevel?: CefrLevel | null;
  /** 1–500 */
  dailyGoalWords: number;
  /** 0–200 */
  newWordsPerDay: number;
  reminderEnabled: boolean;
  reminderTime?: string | null;
  soundEnabled: boolean;
}

/** Swagger: UpdateMySettingsResponse */
export interface UpdateMySettingsResponse {
  learningLanguageId: number | null;
  cefrLevel: string | null;
  dailyGoalWords: number;
  newWordsPerDay: number;
  reminderEnabled: boolean;
  reminderTime: string | null;
  soundEnabled: boolean;
  updatedAt: string;
}

/** Swagger: GET /api/languages → GetAllLanguagesResponse */
export interface SettingsLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}
