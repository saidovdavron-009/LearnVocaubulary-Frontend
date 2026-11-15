import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { ResendEmailVerificationResponse, VerifyEmailRequest } from './verify-email.models';

@Injectable({ providedIn: 'root' })
export class VerifyEmailService {
  private readonly http = inject(HttpClient);
  private readonly quiet = { context: new HttpContext().set(SKIP_ERROR_TOAST, true) };

  /** POST /api/auth/verify-email */
  verify(body: VerifyEmailRequest): Observable<void> {
    return this.http.post<void>(apiUrl('/auth/verify-email'), body, this.quiet);
  }

  /** POST /api/auth/verify-email/resend */
  resend(): Observable<ResendEmailVerificationResponse> {
    return this.http.post<ResendEmailVerificationResponse>(apiUrl('/auth/verify-email/resend'), null, this.quiet);
  }
}
