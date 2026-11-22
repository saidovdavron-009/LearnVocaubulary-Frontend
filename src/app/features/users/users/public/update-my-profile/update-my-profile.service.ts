import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { PaginatedResponse } from '../../../../../core/api/paginated-response.model';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import {
  ProfileLanguage,
  UpdateMyProfileRequest,
  UpdateMyProfileResponse,
  UploadImageResponse,
} from './update-my-profile.models';

@Injectable({ providedIn: 'root' })
export class UpdateMyProfileService {
  private readonly http = inject(HttpClient);

  languages(): Observable<ProfileLanguage[]> {
    return this.http
      .get<PaginatedResponse<ProfileLanguage>>(apiUrl('/languages'), { params: { page: 1, pageSize: 100 } })
      .pipe(map((r) => r.data));
  }

  /** POST /api/uploads/images — kompyuterdan rasm yuklash (multipart). */
  uploadImage(file: File): Observable<UploadImageResponse> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<UploadImageResponse>(apiUrl('/uploads/images'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  /** PUT /api/profile/me — xatolar formada ko'rsatiladi. */
  update(body: UpdateMyProfileRequest): Observable<UpdateMyProfileResponse> {
    return this.http.put<UpdateMyProfileResponse>(apiUrl('/profile/me'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
