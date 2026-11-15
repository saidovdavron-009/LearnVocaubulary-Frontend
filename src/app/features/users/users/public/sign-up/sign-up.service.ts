import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { SignUpRequest, SignUpResponse } from './sign-up.models';

@Injectable({ providedIn: 'root' })
export class SignUpService {
  private readonly http = inject(HttpClient);

  /** POST /api/auth/sign-up — hisob yaratiladi va emailga 6 xonali tasdiqlash kodi yuboriladi. */
  signUp(body: SignUpRequest): Observable<SignUpResponse> {
    return this.http.post<SignUpResponse>(apiUrl('/auth/sign-up'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
