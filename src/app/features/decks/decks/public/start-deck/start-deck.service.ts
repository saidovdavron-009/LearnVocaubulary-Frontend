import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { StartDeckResponse } from './start-deck.models';

@Injectable({ providedIn: 'root' })
export class StartDeckService {
  private readonly http = inject(HttpClient);

  /** POST /api/decks/{id}/start — to'plam so'zlari mening so'zlarimga qo'shiladi. */
  start(deckId: number): Observable<StartDeckResponse> {
    return this.http.post<StartDeckResponse>(apiUrl(`/decks/${deckId}/start`), null);
  }
}
