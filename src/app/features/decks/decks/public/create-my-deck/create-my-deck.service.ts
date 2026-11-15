import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { CreateMyDeckRequest, CreateMyDeckResponse, DeckLanguage, DeckLearningSettings } from './create-my-deck.models';

@Injectable({ providedIn: 'root' })
export class CreateMyDeckService {
  private readonly http = inject(HttpClient);

  /** Til tanlagichi uchun: tillar ro'yxati va standart (o'rganilayotgan) til. */
  options(): Observable<{ languages: DeckLanguage[]; defaultLanguageId: number | null }> {
    return forkJoin({
      languages: this.http
        .get<PaginatedResponse<DeckLanguage>>(apiUrl('/languages'), { params: { page: 1, pageSize: 100 } })
        .pipe(map((r) => r.data)),
      settings: this.http.get<DeckLearningSettings>(apiUrl('/profile/me/settings')).pipe(catchError(() => of(null))),
    }).pipe(map(({ languages, settings }) => ({ languages, defaultLanguageId: settings?.learningLanguageId ?? null })));
  }

  /** POST /api/decks — xatolar formada ko'rsatiladi. */
  create(body: CreateMyDeckRequest): Observable<CreateMyDeckResponse> {
    return this.http.post<CreateMyDeckResponse>(apiUrl('/decks'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
