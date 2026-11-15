import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import {
  StartedSession,
  StudyQueue,
  StudyQueueMode,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from './study-session.models';

@Injectable({ providedIn: 'root' })
export class StudySessionService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** GET /api/study/queue */
  queue(limit: number, mode: StudyQueueMode, deckId: number | null): Observable<StudyQueue> {
    let params = new HttpParams().set('limit', limit).set('mode', mode);
    if (deckId) params = params.set('deckId', deckId);
    return this.http.get<StudyQueue>(apiUrl('/study/queue'), { params, context: this.quiet });
  }

  /** POST /api/study/sessions */
  start(): Observable<StartedSession> {
    return this.http.post<StartedSession>(apiUrl('/study/sessions'), {}, { context: this.quiet });
  }

  /** POST /api/study/sessions/{id}/answers */
  submit(body: SubmitAnswerRequest): Observable<SubmitAnswerResponse> {
    return this.http.post<SubmitAnswerResponse>(apiUrl(`/study/sessions/${body.sessionId}/answers`), body);
  }

  /** POST /api/study/sessions/{id}/finish */
  finish(sessionId: number): Observable<unknown> {
    return this.http.post(apiUrl(`/study/sessions/${sessionId}/finish`), { sessionId });
  }

  /** Ovozli effektlar sozlamasi (GET /api/profile/me/settings). Xato bo'lsa — yoqilgan. */
  soundEnabled(): Observable<boolean> {
    return this.http
      .get<{ soundEnabled: boolean }>(apiUrl('/profile/me/settings'), { context: this.quiet })
      .pipe(
        map((s) => s.soundEnabled),
        catchError(() => of(true)),
      );
  }
}
