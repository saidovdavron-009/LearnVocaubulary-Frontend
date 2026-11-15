/** Swagger: POST /api/words/{wordId}/mnemonics → CreateMnemonicRequest (5–1000 belgi). */
export interface CreateMnemonicRequest {
  text: string;
  imageUrl?: string | null;
}

/** Swagger: CreateMnemonicResponse */
export interface CreateMnemonicResponse {
  id: number;
  wordId: number;
  text: string;
  imageUrl: string | null;
  upvotes: number;
  createdAt: string;
}
