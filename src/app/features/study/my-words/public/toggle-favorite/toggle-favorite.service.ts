import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { ToggleFavoriteResponse } from './toggle-favorite.models';

@Injectable({ providedIn: 'root' })
export class ToggleFavoriteService {
  private readonly http = inject(HttpClient);

  /** POST /api/my-words/{wordId}/favorite — holatni almashtiradi. */
  toggle(wordId: number): Observable<ToggleFavoriteResponse> {
    return this.http.post<ToggleFavoriteResponse>(apiUrl(`/my-words/${wordId}/favorite`), null);
  }
}
