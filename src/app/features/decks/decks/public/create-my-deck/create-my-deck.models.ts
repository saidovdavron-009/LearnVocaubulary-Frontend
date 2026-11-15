import { CefrLevel } from '../../../../../core/api/enums';

/** Swagger: POST /api/decks → CreateMyDeckRequest */
export interface CreateMyDeckRequest {
  languageId: number;
  title: string;
  description?: string | null;
  cefrLevel?: CefrLevel | null;
  coverUrl?: string | null;
  isPublic: boolean;
}

/** Swagger: CreateMyDeckResponse */
export interface CreateMyDeckResponse {
  id: number;
  languageId: number;
  title: string;
  description: string | null;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  isPublic: boolean;
  createdAt: string;
}

/** Swagger: GET /api/languages → GetAllLanguagesResponse */
export interface DeckLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}

/** Swagger: GET /api/profile/me/settings (faqat kerakli maydon). */
export interface DeckLearningSettings {
  learningLanguageId: number | null;
}
