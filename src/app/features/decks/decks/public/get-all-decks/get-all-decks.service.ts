import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { CefrLevel, DeckScope } from '../../../../../core/api/enums';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { DeckListItem, FeaturedDeck, GetAllDecksQuery } from './get-all-decks.models';

@Injectable({ providedIn: 'root' })
export class GetAllDecksService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** GET /api/decks */
  getAll(query: GetAllDecksQuery): Observable<PaginatedResponse<DeckListItem>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<DeckListItem>>(apiUrl('/decks'), { params, context: this.quiet });
  }

  /** GET /api/decks/featured — haftaning to'plami (204 bo'lsa null). Banner ixtiyoriy: xatoda null. */
  featured(): Observable<FeaturedDeck | null> {
    return this.http
      .get<FeaturedDeck | null>(apiUrl('/decks/featured'), { context: this.quiet })
      .pipe(catchError(() => of(null)));
  }

  /** Tablardagi hisoblagichlar: har bir scope bo'yicha totalCount. */
  counts(scopes: DeckScope[], cefrLevel: CefrLevel | null): Observable<Record<string, number | null>> {
    const requests = Object.fromEntries(
      scopes.map((scope) => [
        scope,
        this.getAll({ scope, cefrLevel, page: 1, pageSize: 1 }).pipe(
          map((r) => r.totalCount as number | null),
          catchError(() => of(null)),
        ),
      ]),
    );
    return forkJoin(requests);
  }
}
