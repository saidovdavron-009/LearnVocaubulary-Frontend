import { CefrLevel, PartOfSpeech, WordStatus } from '../../../../../core/api/enums';

/** Swagger: GET /api/decks/{id} → GetOneDeckResponse */
export interface DeckDetail {
  id: number;
  languageId: number;
  languageCode: string;
  title: string;
  description: string | null;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  isPublic: boolean;
  ownerUsername: string | null;
  isMine: boolean;
  wordsCount: number;
  learnersCount: number;
  isStarted: boolean;
  startedAt: string | null;
  masteredCount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

/** Swagger: GET /api/decks/{deckId}/words → GetAllDeckWordsResponse */
export interface DeckWord {
  wordId: number;
  position: number | null;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  primaryTranslation: string | null;
  audioUrl: string | null;
  /** Mening so'zlarimdagi holati; ro'yxatda bo'lmasa null. */
  myStatus: WordStatus | null;
}
