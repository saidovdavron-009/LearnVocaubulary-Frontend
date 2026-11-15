import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import {
  GetAllWordsQuery,
  WordCategory,
  WordLanguage,
  WordListItem,
  WordOfTheDay,
  WordsLearningSettings,
} from './get-all-words.models';

@Injectable({ providedIn: 'root' })
export class GetAllWordsService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** GET /api/words */
  getAll(query: GetAllWordsQuery): Observable<PaginatedResponse<WordListItem>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PaginatedResponse<WordListItem>>(apiUrl('/words'), { params, context: this.quiet });
  }

  /** GET /api/words/word-of-the-day — topilmasa (404) null. */
  wordOfTheDay(languageId: number | null): Observable<WordOfTheDay | null> {
    const params = languageId ? new HttpParams().set('languageId', languageId) : undefined;
    return this.http
      .get<WordOfTheDay>(apiUrl('/words/word-of-the-day'), { params, context: this.quiet })
      .pipe(catchError(() => of(null)));
  }

  categories(): Observable<WordCategory[]> {
    return this.http
      .get<PaginatedResponse<WordCategory>>(apiUrl('/categories'), {
        params: { rootOnly: false, page: 1, pageSize: 100 },
        context: this.quiet,
      })
      .pipe(
        map((r) => r.data),
        catchError(() => of([])),
      );
  }

  languages(): Observable<WordLanguage[]> {
    return this.http
      .get<PaginatedResponse<WordLanguage>>(apiUrl('/languages'), { params: { page: 1, pageSize: 100 }, context: this.quiet })
      .pipe(
        map((r) => r.data),
        catchError(() => of([])),
      );
  }

  /** O'rganilayotgan til (ro'yxatni shu til bo'yicha filtrlash uchun). */
  settings(): Observable<WordsLearningSettings | null> {
    return this.http
      .get<WordsLearningSettings>(apiUrl('/profile/me/settings'), { context: this.quiet })
      .pipe(catchError(() => of(null)));
  }
}
