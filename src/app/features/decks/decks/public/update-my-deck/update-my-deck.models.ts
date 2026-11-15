import { CefrLevel } from '../../../../../core/api/enums';

/** Swagger: PUT /api/decks/{id} → UpdateMyDeckRequest */
export interface UpdateMyDeckRequest {
  title: string;
  description?: string | null;
  cefrLevel?: CefrLevel | null;
  coverUrl?: string | null;
  isPublic: boolean;
}

/** Swagger: UpdateMyDeckResponse */
export interface UpdateMyDeckResponse {
  id: number;
  languageId: number;
  title: string;
  description: string | null;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  isPublic: boolean;
  updatedAt: string;
}

/** Tahrirlash oynasini to'ldirish uchun joriy qiymatlar. */
export interface EditableDeck {
  id: number;
  title: string;
  description: string | null;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  isPublic: boolean;
}
