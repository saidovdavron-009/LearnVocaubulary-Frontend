import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { NotificationType } from '../../../../../core/api/enums';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';

/** Swagger: GetAllNotificationsResponse */
export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Swagger: GetFriendRequestsResponse (kerakli maydonlar). */
export interface PendingRequest {
  id: number;
  username: string;
  displayName: string | null;
}

@Injectable({ providedIn: 'root' })
export class GetNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  getAll(query: { unreadOnly?: boolean; type?: NotificationType | null; page: number; pageSize: number }): Observable<PaginatedResponse<NotificationItem>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.unreadOnly) params = params.set('unreadOnly', true);
    if (query.type) params = params.set('type', query.type);
    return this.http.get<PaginatedResponse<NotificationItem>>(apiUrl('/notifications'), { params, context: this.quiet });
  }

  count(query: { unreadOnly?: boolean; type?: NotificationType | null }): Observable<number> {
    return this.getAll({ ...query, page: 1, pageSize: 1 }).pipe(map((r) => r.totalCount));
  }

  markRead(id: number): Observable<unknown> {
    return this.http.post(apiUrl(`/notifications/${id}/read`), { id });
  }

  markAllRead(): Observable<unknown> {
    return this.http.post(apiUrl('/notifications/read-all'), {});
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/notifications/${id}`));
  }

  incomingRequests(): Observable<PendingRequest[]> {
    return this.http
      .get<PaginatedResponse<PendingRequest>>(apiUrl('/friends/requests'), {
        params: { direction: 'incoming', page: 1, pageSize: 50 },
        context: this.quiet,
      })
      .pipe(map((r) => r.data));
  }

  respond(id: number, accept: boolean): Observable<unknown> {
    return this.http.post(apiUrl(`/friends/requests/${id}/${accept ? 'accept' : 'reject'}`), { id });
  }
}
