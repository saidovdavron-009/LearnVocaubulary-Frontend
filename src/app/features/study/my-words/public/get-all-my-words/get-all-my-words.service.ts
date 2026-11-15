import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, expand, forkJoin, map, Observable, of, reduce, EMPTY } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { WordStatus } from '../../../../../core/api/enums';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { BulkMyWordsAction, GetAllMyWordsQuery, MyDeckOption, MyWordItem } from './get-all-my-words.models';

@Injectable({ providedIn: 'root' })
export class GetAllMyWordsService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** GET /api/my-words */
  getAll(query: GetAllMyWordsQuery): Observable<PaginatedResponse<MyWordItem>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '' && value !== false) params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<MyWordItem>>(apiUrl('/my-words'), { params, context: this.quiet });
  }

  /** Holat kartochkalari va tab hisoblagichlari: har biri uchun totalCount (pageSize=1). */
  counts(): Observable<Record<string, number | null>> {
    const count = (q: Partial<GetAllMyWordsQuery>) =>
      this.getAll({ ...q, page: 1, pageSize: 1 }).pipe(
        map((r) => r.totalCount as number | null),
        catchError(() => of(null)),
      );
    const statuses: WordStatus[] = ['new', 'learning', 'review', 'mastered'];
    return forkJoin({
      all: count({}),
      favorites: count({ isFavorite: true }),
      due: count({ dueToday: true }),
      hard: count({ hardOnly: true }),
      ...Object.fromEntries(statuses.map((s) => [s, count({ status: s })])),
    });
  }

  /** Eksport uchun filtrga mos barcha so'zlar (sahifama-sahifa, 100 tadan). */
  getAllPages(query: Omit<GetAllMyWordsQuery, 'page' | 'pageSize'>): Observable<MyWordItem[]> {
    const page = (n: number) => this.getAll({ ...query, page: n, pageSize: 100 });
    return page(1).pipe(
      expand((res) => (res.hasNext ? page(res.page + 1) : EMPTY)),
      reduce((all, res) => [...all, ...res.data], [] as MyWordItem[]),
    );
  }

  /** POST /api/my-words/bulk */
  bulk(wordIds: number[], action: BulkMyWordsAction): Observable<{ affected: number; notFound: number[] }> {
    return this.http.post<{ affected: number; notFound: number[] }>(apiUrl('/my-words/bulk'), { wordIds, action });
  }

  /** Mening to'plamlarim (GET /api/decks?scope=mine). */
  myDecks(): Observable<MyDeckOption[]> {
    return this.http
      .get<PaginatedResponse<MyDeckOption>>(apiUrl('/decks'), { params: { scope: 'mine', page: 1, pageSize: 100 }, context: this.quiet })
      .pipe(map((r) => r.data));
  }

  /** POST /api/decks/{deckId}/words */
  addToDeck(deckId: number, wordIds: number[]): Observable<{ added: number; skipped: number }> {
    return this.http.post<{ added: number; skipped: number }>(apiUrl(`/decks/${deckId}/words`), { deckId, wordIds });
  }
}
