import { CefrLevel, PartOfSpeech, WordStatus } from '../../../../../core/api/enums';

export type MyWordsTab = 'all' | 'favorites' | 'due' | 'hard';
export type MyWordsSort = 'next_review' | 'newest' | 'text' | 'memory' | 'lapses';
export type BulkMyWordsAction = 'favorite' | 'unfavorite' | 'reset' | 'remove';

/** GET /api/my-words query (Swagger: GetAllMyWordsRequest). */
export interface GetAllMyWordsQuery {
  search?: string | null;
  status?: WordStatus | null;
  isFavorite?: boolean | null;
  dueOnly?: boolean;
  dueToday?: boolean;
  hardOnly?: boolean;
  sortBy?: MyWordsSort;
  page: number;
  pageSize: number;
}

/** Swagger: GetAllMyWordsResponse */
export interface MyWordItem {
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
  deckTitle: string | null;
  /** 0–100 */
  memoryPercent: number;
}

/** Swagger: GetAllDecksResponse (faqat "To'plamga qo'shish" uchun kerakli maydonlar). */
export interface MyDeckOption {
  id: number;
  title: string;
  wordsCount: number;
}
