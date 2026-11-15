import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';

export type LeaderboardScope = 'friends' | 'global' | 'city';

/** Swagger: GetLeaderboardResponse */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  isMe: boolean;
  currentStreak: number;
  previousRank: number | null;
}

/** Swagger: GetMyRankResponse */
export interface MyRank {
  rank: number | null;
  xp: number;
  totalParticipants: number;
}

/** Swagger: GetFriendRequestsResponse */
export interface FriendRequest {
  id: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  createdAt: string;
  mutualFriendsCount: number;
  timezone: string | null;
}

/** Swagger: GetFriendSuggestionsResponse */
export interface FriendSuggestion {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  learningLanguageName: string | null;
  mutualFriendsCount: number;
}

/** Swagger: SendFriendRequestResponse */
export interface SentFriendRequest {
  id: number;
  status: 'pending' | 'accepted';
  username: string;
}

@Injectable({ providedIn: 'root' })
export class GetFriendsService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  private scopeParams(scope: LeaderboardScope): Record<string, string | number | boolean> {
    return { period: 'week', friendsOnly: scope === 'friends', sameTimezone: scope === 'city' };
  }

  leaderboard(scope: LeaderboardScope): Observable<LeaderboardEntry[]> {
    return this.http
      .get<PaginatedResponse<LeaderboardEntry>>(apiUrl('/leaderboard'), {
        params: { ...this.scopeParams(scope), page: 1, pageSize: 50 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  myRank(scope: LeaderboardScope): Observable<MyRank> {
    return this.http.get<MyRank>(apiUrl('/leaderboard/me'), { params: this.scopeParams(scope), context: this.quiet });
  }

  friendsCount(): Observable<number> {
    return this.http
      .get<PaginatedResponse<unknown>>(apiUrl('/friends'), { params: { page: 1, pageSize: 1 }, context: this.quiet })
      .pipe(map((r) => r.totalCount));
  }

  incomingRequests(): Observable<FriendRequest[]> {
    return this.http
      .get<PaginatedResponse<FriendRequest>>(apiUrl('/friends/requests'), {
        params: { direction: 'incoming', page: 1, pageSize: 20 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  suggestions(): Observable<FriendSuggestion[]> {
    return this.http.get<FriendSuggestion[]>(apiUrl('/friends/suggestions'), { params: { limit: 3 }, context: this.quiet });
  }

  send(username: string): Observable<SentFriendRequest> {
    return this.http.post<SentFriendRequest>(apiUrl('/friends/requests'), { username });
  }

  accept(id: number): Observable<unknown> {
    return this.http.post(apiUrl(`/friends/requests/${id}/accept`), { id });
  }

  reject(id: number): Observable<unknown> {
    return this.http.post(apiUrl(`/friends/requests/${id}/reject`), { id });
  }
}
