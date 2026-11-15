import { CefrLevel, PartOfSpeech, WordStatus } from '../../../../../core/api/enums';

/** Swagger: GetOneWordResponse_TranslationItem */
export interface WordTranslation {
  id: number;
  languageCode: string;
  translation: string;
  isPrimary: boolean;
}

/** Swagger: GetOneWordResponse_ExampleItem */
export interface WordExample {
  id: number;
  sentence: string;
  translationLanguageCode: string | null;
  translation: string | null;
  audioUrl: string | null;
}

/** Swagger: GetOneWordResponse_CategoryItem */
export interface WordCategoryRef {
  id: number;
  slug: string;
  name: string;
}

/** Swagger: GetOneWordResponse_MnemonicItem */
export interface WordMnemonic {
  id: number;
  text: string;
  imageUrl: string | null;
  upvotes: number;
  authorUsername: string | null;
  votedByMe: boolean;
  createdAt: string;
}

/** Swagger: GET /api/words/{id} → GetOneWordResponse */
export interface WordDetail {
  id: number;
  languageCode: string;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  frequencyRank: number | null;
  audioUrl: string | null;
  imageUrl: string | null;
  isCustom: boolean;
  translations: WordTranslation[];
  examples: WordExample[];
  categories: WordCategoryRef[];
  mnemonics: WordMnemonic[];
}

/** Swagger: GET /api/my-words → GetAllMyWordsResponse ("Sizning progress" kartasi uchun). */
export interface WordMyProgress {
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

/** Swagger: GET /api/words → GetAllWordsResponse ("Bog'liq so'zlar" — shu mavzudagi so'zlar). */
export interface RelatedWord {
  id: number;
  languageCode: string;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  primaryTranslation: string | null;
  audioUrl: string | null;
  isCustom: boolean;
}
