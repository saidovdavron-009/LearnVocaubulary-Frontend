import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { DeckDetail, DeckWord } from './get-one-deck.models';

const WORDS_PAGE_SIZE = 100;
/** Juda katta to'plamlarda brauzerni og'irlashtirmaslik uchun chegara (2000 so'z). */
const MAX_PAGES = 20;

@Injectable({ providedIn: 'root' })
export class GetOneDeckService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** GET /api/decks/{id} */
  deck(id: number): Observable<DeckDetail> {
    return this.http.get<DeckDetail>(apiUrl(`/decks/${id}`), { context: this.quiet });
  }

  /**
   * GET /api/decks/{deckId}/words — barcha sahifalar. API'da qidiruv parametri yo'q,
   * shuning uchun qidiruv va holat bo'yicha hisob (progress kartasi) brauzerda bajariladi.
   */
  allWords(deckId: number): Observable<{ words: DeckWord[]; total: number; truncated: boolean }> {
    const page = (p: number) =>
      this.http.get<PaginatedResponse<DeckWord>>(apiUrl(`/decks/${deckId}/words`), {
        params: { page: p, pageSize: WORDS_PAGE_SIZE },
        context: this.quiet,
      });
    return page(1).pipe(
      switchMap((first) => {
        const last = Math.min(first.totalPages, MAX_PAGES);
        if (last <= 1) return of({ words: first.data, total: first.totalCount, truncated: false });
        const rest = Array.from({ length: last - 1 }, (_, i) => page(i + 2));
        return forkJoin(rest).pipe(
          map((pages) => ({
            words: [first, ...pages].flatMap((p) => p.data),
            total: first.totalCount,
            truncated: first.totalPages > MAX_PAGES,
          })),
        );
      }),
    );
  }
}
