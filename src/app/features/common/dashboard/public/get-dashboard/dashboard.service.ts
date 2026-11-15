import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import {
  DashboardActivity,
  DashboardDeck,
  DashboardLeader,
  DashboardQueue,
  DashboardSession,
  DashboardStats,
} from './dashboard.models';

/** Dashboard bloklari mustaqil yuklanadi — biri xato bersa qolganlari ishlaydi. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  stats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(apiUrl('/stats/me'), { context: this.quiet });
  }

  activity(days: number): Observable<DashboardActivity> {
    return this.http.get<DashboardActivity>(apiUrl('/stats/me/activity'), { params: { days }, context: this.quiet });
  }

  queue(limit: number): Observable<DashboardQueue> {
    return this.http.get<DashboardQueue>(apiUrl('/study/queue'), { params: { limit }, context: this.quiet });
  }

  startedDecks(): Observable<DashboardDeck[]> {
    return this.http
      .get<PaginatedResponse<DashboardDeck>>(apiUrl('/decks'), {
        params: { scope: 'started', page: 1, pageSize: 3 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  friendsLeaderboard(): Observable<DashboardLeader[]> {
    return this.http
      .get<PaginatedResponse<DashboardLeader>>(apiUrl('/leaderboard'), {
        params: { period: 'week', friendsOnly: true, page: 1, pageSize: 4 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  /** So'nggi tugagan mashg'ulotlar — "Aniqlik" ko'rsatkichi uchun. */
  recentSessions(): Observable<DashboardSession[]> {
    return this.http
      .get<PaginatedResponse<DashboardSession>>(apiUrl('/study/sessions'), {
        params: { onlyFinished: true, page: 1, pageSize: 20 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }
}
