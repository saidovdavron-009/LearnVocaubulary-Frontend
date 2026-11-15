/** Swagger: POST /api/my-words/{wordId}/favorite → ToggleFavoriteResponse */
export interface ToggleFavoriteResponse {
  wordId: number;
  isFavorite: boolean;
}
