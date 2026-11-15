/** Swagger: POST /api/decks/{id}/start → StartDeckResponse */
export interface StartDeckResponse {
  deckId: number;
  startedAt: string;
  /** Mening so'zlarimga yangi qo'shilgan so'zlar soni. */
  addedWords: number;
  /** Allaqachon o'rganilayotgan so'zlar soni. */
  alreadyLearning: number;
}
