import { CefrLevel, DeckScope } from '../../../../../core/api/enums';

/** GET /api/decks query (Swagger). scope, page, pageSize — majburiy. */
export interface GetAllDecksQuery {
  scope: DeckScope;
  search?: string | null;
  languageId?: number | null;
  cefrLevel?: CefrLevel | null;
  page: number;
  pageSize: number;
}

/** Swagger: GetAllDecksResponse */
export interface DeckListItem {
  id: number;
  title: string;
  description: string | null;
  languageCode: string;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  isPublic: boolean;
  ownerUsername: string | null;
  isMine: boolean;
  wordsCount: number;
  learnersCount: number;
  isStarted: boolean;
  /** O'zlashtirilgan so'zlar foizi (0–100). */
  progress: number;
}

/** Swagger: GET /api/decks/featured → GetFeaturedDeckResponse ("Haftaning to'plami"). 204 — tanlanadigan to'plam yo'q. */
export interface FeaturedDeck {
  id: number;
  title: string;
  description: string | null;
  languageCode: string;
  cefrLevel: CefrLevel | null;
  coverUrl: string | null;
  wordsCount: number;
  learnersCount: number;
  isStarted: boolean;
  progress: number;
}
