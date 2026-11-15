import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { CefrLevel, WordStatus } from '../../../../../core/api/enums';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import {
  HomeAchievements,
  HomeActivity,
  HomeCategory,
  HomeDeck,
  HomeLeaderboardEntry,
  HomeMyWord,
  HomeStats,
  HomeWordOfTheDay,
} from './home.models';

/** Landing bo'limlari bir-biridan mustaqil yuklanadi; xato bo'lsa bo'lim o'zi xato holatini ko'rsatadi. */
@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  wordOfTheDay(): Observable<HomeWordOfTheDay> {
    return this.http.get<HomeWordOfTheDay>(apiUrl('/words/word-of-the-day'), { context: this.quiet });
  }

  categories(): Observable<HomeCategory[]> {
    return this.http
      .get<PaginatedResponse<HomeCategory>>(apiUrl('/categories'), {
        params: { rootOnly: true, page: 1, pageSize: 6 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  decks(cefrLevel: CefrLevel | null): Observable<HomeDeck[]> {
    let params = new HttpParams().set('scope', 'public').set('page', 1).set('pageSize', 4);
    if (cefrLevel) params = params.set('cefrLevel', cefrLevel);
    return this.http
      .get<PaginatedResponse<HomeDeck>>(apiUrl('/decks'), { params, context: this.quiet })
      .pipe(map((r) => r.data));
  }

  stats(): Observable<HomeStats> {
    return this.http.get<HomeStats>(apiUrl('/stats/me'), { context: this.quiet });
  }

  activity(days: number): Observable<HomeActivity> {
    return this.http.get<HomeActivity>(apiUrl('/stats/me/activity'), { params: { days }, context: this.quiet });
  }

  myWords(status: WordStatus | null): Observable<PaginatedResponse<HomeMyWord>> {
    let params = new HttpParams().set('dueOnly', false).set('page', 1).set('pageSize', 6);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<HomeMyWord>>(apiUrl('/my-words'), { params, context: this.quiet });
  }

  leaderboard(): Observable<HomeLeaderboardEntry[]> {
    return this.http
      .get<PaginatedResponse<HomeLeaderboardEntry>>(apiUrl('/leaderboard'), {
        params: { period: 'week', friendsOnly: true, page: 1, pageSize: 5 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  achievements(): Observable<HomeAchievements> {
    return this.http.get<HomeAchievements>(apiUrl('/achievements/me'), { context: this.quiet });
  }
}
