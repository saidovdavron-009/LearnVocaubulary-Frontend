import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { ResendResetCodeRequest, ResetPasswordRequest } from './reset-password.models';

@Injectable({ providedIn: 'root' })
export class ResetPasswordService {
  private readonly http = inject(HttpClient);
  private readonly quiet = { context: new HttpContext().set(SKIP_ERROR_TOAST, true) };

  /** POST /api/auth/reset-password */
  resetPassword(body: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(apiUrl('/auth/reset-password'), body, this.quiet);
  }

  /** POST /api/auth/forgot-password — "Qayta yuborish" tugmasi uchun. */
  resendCode(body: ResendResetCodeRequest): Observable<void> {
    return this.http.post<void>(apiUrl('/auth/forgot-password'), body, this.quiet);
  }
}
