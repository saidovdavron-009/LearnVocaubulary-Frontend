/** Swagger: DELETE /api/decks/{id}/start → StopDeckRequest */
export interface StopDeckRequest {
  removeNewWords: boolean;
}

/** Swagger: StopDeckResponse */
export interface StopDeckResponse {
  deckId: number;
  removedWords: number;
}
