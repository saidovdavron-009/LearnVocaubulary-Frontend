import { WordStatus } from '../../../../../core/api/enums';

/** Swagger: POST /api/my-words → AddMyWordRequest */
export interface AddMyWordRequest {
  wordId: number;
}

/** Swagger: AddMyWordResponse */
export interface AddMyWordResponse {
  wordId: number;
  status: WordStatus;
  isFavorite: boolean;
  createdAt: string;
}
