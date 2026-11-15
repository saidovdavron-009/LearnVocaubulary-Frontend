import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { RelatedWord, WordDetail, WordMyProgress } from './get-one-word.models';

@Injectable({ providedIn: 'root' })
export class GetOneWordService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** GET /api/words/{id} */
  word(id: number): Observable<WordDetail> {
    return this.http.get<WordDetail>(apiUrl(`/words/${id}`), { context: this.quiet });
  }

  /**
   * Mening so'zlarimdagi holati. API'da bitta so'z uchun endpoint yo'q, shuning uchun
   * GET /api/my-words?search=<so'z> natijasidan id bo'yicha topiladi. Ro'yxatda bo'lmasa — null.
   */
  myProgress(wordId: number, text: string): Observable<WordMyProgress | null> {
    return this.http
      .get<PaginatedResponse<WordMyProgress>>(apiUrl('/my-words'), {
        params: { search: text, dueOnly: false, page: 1, pageSize: 50 },
        context: this.quiet,
      })
      .pipe(
        map((r) => r.data.find((w) => w.wordId === wordId) ?? null),
        catchError(() => of(null)),
      );
  }

  /** "Bog'liq so'zlar": shu so'zning birinchi mavzusidagi boshqa so'zlar. */
  related(categoryId: number, excludeId: number): Observable<RelatedWord[]> {
    return this.http
      .get<PaginatedResponse<RelatedWord>>(apiUrl('/words'), {
        params: { categoryId, onlyMine: false, page: 1, pageSize: 5 },
        context: this.quiet,
      })
      .pipe(
        map((r) => r.data.filter((w) => w.id !== excludeId).slice(0, 4)),
        catchError(() => of([])),
      );
  }
}
