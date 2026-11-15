import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';

@Injectable({ providedIn: 'root' })
export class DeleteMyDeckService {
  private readonly http = inject(HttpClient);

  /** DELETE /api/decks/{id} — 204 */
  delete(deckId: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/decks/${deckId}`));
  }
}
