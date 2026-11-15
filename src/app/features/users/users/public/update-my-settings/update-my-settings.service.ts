import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { MySettings, SettingsLanguage, UpdateMySettingsRequest, UpdateMySettingsResponse } from './update-my-settings.models';

@Injectable({ providedIn: 'root' })
export class UpdateMySettingsService {
  private readonly http = inject(HttpClient);

  load(): Observable<{ settings: MySettings; languages: SettingsLanguage[] }> {
    return forkJoin({
      settings: this.http.get<MySettings>(apiUrl('/profile/me/settings')),
      languages: this.http
        .get<PaginatedResponse<SettingsLanguage>>(apiUrl('/languages'), { params: { page: 1, pageSize: 100 } })
        .pipe(map((r) => r.data)),
    });
  }

  /** PUT /api/profile/me/settings */
  update(body: UpdateMySettingsRequest): Observable<UpdateMySettingsResponse> {
    return this.http.put<UpdateMySettingsResponse>(apiUrl('/profile/me/settings'), body);
  }
}
