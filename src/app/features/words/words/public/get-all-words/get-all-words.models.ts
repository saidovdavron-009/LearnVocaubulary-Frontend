import { CefrLevel, PartOfSpeech } from '../../../../../core/api/enums';

/** GET /api/words query parametrlari (Swagger). onlyMine, page, pageSize — majburiy. */
export interface GetAllWordsQuery {
  search?: string | null;
  languageId?: number | null;
  cefrLevel?: CefrLevel | null;
  partOfSpeech?: PartOfSpeech | null;
  categoryId?: number | null;
  onlyMine: boolean;
  page: number;
  pageSize: number;
}

/** Swagger: GetAllWordsResponse */
export interface WordListItem {
  id: number;
  languageCode: string;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  primaryTranslation: string | null;
  audioUrl: string | null;
  isCustom: boolean;
  /** Birinchi misol gap. */
  exampleSentence: string | null;
  /** "Mening so'zlarim"da bormi. */
  isInMyWords: boolean;
}

/** Swagger: GET /api/words/word-of-the-day → GetWordOfTheDayResponse */
export interface WordOfTheDay {
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
export interface WordCategory {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  icon: string | null;
  hasChildren: boolean;
}

/** Swagger: GET /api/languages → GetAllLanguagesResponse */
export interface WordLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}

/** Swagger: GET /api/profile/me/settings → GetMySettingsResponse (faqat kerakli maydon). */
export interface WordsLearningSettings {
  learningLanguageId: number | null;
  learningLanguageCode: string | null;
}
