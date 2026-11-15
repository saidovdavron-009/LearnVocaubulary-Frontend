import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { SignInRequest, SignInResponse } from './sign-in.models';

@Injectable({ providedIn: 'root' })
export class SignInService {
  private readonly http = inject(HttpClient);

  /** POST /api/auth/sign-in — xatolar formada ko'rsatiladi. */
  signIn(body: SignInRequest): Observable<SignInResponse> {
    return this.http.post<SignInResponse>(apiUrl('/auth/sign-in'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
