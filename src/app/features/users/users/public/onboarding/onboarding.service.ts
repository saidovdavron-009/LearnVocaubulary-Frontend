import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import {
  OnboardingLanguage,
  OnboardingProfile,
  OnboardingSettings,
  UpdateProfileRequest,
  UpdateSettingsRequest,
} from './onboarding.models';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);

  /** Boshlang'ich ma'lumot: tillar, profil va sozlamalar. */
  load(): Observable<{ languages: OnboardingLanguage[]; profile: OnboardingProfile; settings: OnboardingSettings }> {
    return forkJoin({
      languages: this.http
        .get<PaginatedResponse<OnboardingLanguage>>(apiUrl('/languages'), { params: { page: 1, pageSize: 100 } })
        .pipe(map((r) => r.data)),
      profile: this.http.get<OnboardingProfile>(apiUrl('/profile/me')),
      settings: this.http.get<OnboardingSettings>(apiUrl('/profile/me/settings')),
    });
  }

  /** PUT /api/profile/me va PUT /api/profile/me/settings */
  save(profile: UpdateProfileRequest, settings: UpdateSettingsRequest): Observable<unknown> {
    return forkJoin([
      this.http.put(apiUrl('/profile/me'), profile),
      this.http.put(apiUrl('/profile/me/settings'), settings),
    ]);
  }
}
