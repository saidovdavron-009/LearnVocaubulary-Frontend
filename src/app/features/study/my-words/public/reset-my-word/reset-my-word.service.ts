import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { ResetMyWordResponse } from './reset-my-word.models';

@Injectable({ providedIn: 'root' })
export class ResetMyWordService {
  private readonly http = inject(HttpClient);

  /** POST /api/my-words/{wordId}/reset — progress boshidan boshlanadi. */
  reset(wordId: number): Observable<ResetMyWordResponse> {
    return this.http.post<ResetMyWordResponse>(apiUrl(`/my-words/${wordId}/reset`), null);
  }
}
