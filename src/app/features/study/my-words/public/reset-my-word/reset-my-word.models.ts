import { WordStatus } from '../../../../../core/api/enums';

/** Swagger: POST /api/my-words/{wordId}/reset → ResetMyWordResponse */
export interface ResetMyWordResponse {
  wordId: number;
  status: WordStatus;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  nextReviewAt: string | null;
}
