import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { ChangePasswordRequest, SetPasswordRequest } from './change-password.models';

@Injectable({ providedIn: 'root' })
export class ChangePasswordService {
  private readonly http = inject(HttpClient);
  private readonly quiet = { context: new HttpContext().set(SKIP_ERROR_TOAST, true) };

  /** PUT /api/profile/me/password */
  change(body: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(apiUrl('/profile/me/password'), body, this.quiet);
  }

  /** POST /api/profile/me/password */
  set(body: SetPasswordRequest): Observable<void> {
    return this.http.post<void>(apiUrl('/profile/me/password'), body, this.quiet);
  }
}
