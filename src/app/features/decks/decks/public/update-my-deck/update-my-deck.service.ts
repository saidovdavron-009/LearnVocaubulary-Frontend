import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { UpdateMyDeckRequest, UpdateMyDeckResponse } from './update-my-deck.models';

@Injectable({ providedIn: 'root' })
export class UpdateMyDeckService {
  private readonly http = inject(HttpClient);

  /** PUT /api/decks/{id} — xatolar formada ko'rsatiladi. */
  update(deckId: number, body: UpdateMyDeckRequest): Observable<UpdateMyDeckResponse> {
    return this.http.put<UpdateMyDeckResponse>(apiUrl(`/decks/${deckId}`), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
