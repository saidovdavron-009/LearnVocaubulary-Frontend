import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';

@Injectable({ providedIn: 'root' })
export class RemoveMyWordService {
  private readonly http = inject(HttpClient);

  /** DELETE /api/my-words/{wordId} — 204 */
  remove(wordId: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/my-words/${wordId}`));
  }
}
