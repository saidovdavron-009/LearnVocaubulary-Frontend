import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { ForgotPasswordRequest } from './forgot-password.models';

@Injectable({ providedIn: 'root' })
export class ForgotPasswordService {
  private readonly http = inject(HttpClient);

  /** POST /api/auth/forgot-password — emailga 6 xonali kod yuboriladi (30 daqiqa). */
  sendCode(body: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(apiUrl('/auth/forgot-password'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
