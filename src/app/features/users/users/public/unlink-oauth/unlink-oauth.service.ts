import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { OAuthProvider } from '../../../../../core/api/enums';

@Injectable({ providedIn: 'root' })
export class UnlinkOAuthService {
  private readonly http = inject(HttpClient);

  /** DELETE /api/profile/me/oauth/{provider} — 204 */
  unlink(provider: OAuthProvider): Observable<void> {
    return this.http.delete<void>(apiUrl(`/profile/me/oauth/${provider}`));
  }
}
