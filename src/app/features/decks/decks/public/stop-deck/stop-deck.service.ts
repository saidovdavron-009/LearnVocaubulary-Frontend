import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { StopDeckRequest, StopDeckResponse } from './stop-deck.models';

@Injectable({ providedIn: 'root' })
export class StopDeckService {
  private readonly http = inject(HttpClient);

  /** DELETE /api/decks/{id}/start (body bilan) */
  stop(deckId: number, body: StopDeckRequest): Observable<StopDeckResponse> {
    return this.http.delete<StopDeckResponse>(apiUrl(`/decks/${deckId}/start`), { body });
  }
}
