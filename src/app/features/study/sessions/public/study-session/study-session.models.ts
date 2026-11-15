import { LevelUp } from '../../../../../core/api/cefr';
import { CefrLevel, ExerciseType, PartOfSpeech, ReviewRating, WordStatus } from '../../../../../core/api/enums';

/** GET /api/study/queue rejimi: hammasi, faqat yangi so'zlar, faqat takrorlash. */
export type StudyQueueMode = 'all' | 'new' | 'review';

/** Swagger: GetStudyQueueResponse_Item */
export interface StudyQueueItem {
  wordId: number;
  text: string;
  transcription: string | null;
  partOfSpeech: PartOfSpeech | null;
  cefrLevel: CefrLevel | null;
  audioUrl: string | null;
  imageUrl: string | null;
  /** Asosiy tarjima birinchi turadi. */
  translations: string[];
  exampleSentence: string | null;
  exampleTranslation: string | null;
  status: WordStatus;
  isNew: boolean;
  nextReviewAt: string | null;
  /** Test uchun 3 ta noto'g'ri variant. */
  distractors: string[];
}

/** Swagger: GET /api/study/queue → GetStudyQueueResponse */
export interface StudyQueue {
  dueCount: number;
  newCount: number;
  newRemainingToday: number;
  /** Navbat shu daraja bo'yicha filtrlangan (null — filtrsiz, masalan to'plam mashqi). */
  cefrLevel: string | null;
  levelTotal: number;
  levelLearned: number;
  /** Navbat olinishidan oldin daraja tugatilgan bo'lsa. */
  levelUp: LevelUp | null;
  items: StudyQueueItem[];
}

/** Swagger: POST /api/study/sessions → StartSessionResponse */
export interface StartedSession {
  id: number;
  startedAt: string;
}

/** Swagger: SubmitAnswerRequest */
export interface SubmitAnswerRequest {
  sessionId: number;
  wordId: number;
  rating: ReviewRating;
  exerciseType: ExerciseType;
  responseTimeMs: number | null;
}

/** Swagger: SubmitAnswerResponse_AchievementItem */
export interface EarnedAchievement {
  id: number;
  code: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  xpReward: number;
}

/** Swagger: SubmitAnswerResponse */
export interface SubmitAnswerResponse {
  wordId: number;
  isCorrect: boolean;
  xpEarned: number;
  status: WordStatus;
  intervalDays: number;
  nextReviewAt: string | null;
  session: { wordsStudied: number; correctCount: number; wrongCount: number; xpEarned: number };
  stats: { xp: number; level: number; currentStreak: number; totalWordsLearned: number };
  newAchievements: EarnedAchievement[];
  /** Shu javob bilan daraja tugatilgan bo'lsa — keyingi darajaga o'tish. */
  levelUp: LevelUp | null;
}

/** Mashq turi: UI'dagi variant (backend ExerciseType'ga mos). */
export type StudyExercise = 'multiple_choice' | 'listening' | 'typing';

/** Ekrandagi bitta savol. */
export interface StudyQuestion {
  item: StudyQueueItem;
  exercise: StudyExercise;
  /** Test variantlari (aralashtirilgan); to'g'risi — item.translations[0]. */
  options: string[];
}

/** Natija sahifasiga router state orqali uzatiladi. */
export interface StudyResultState {
  achievements: EarnedAchievement[];
  levelBefore: number;
}
