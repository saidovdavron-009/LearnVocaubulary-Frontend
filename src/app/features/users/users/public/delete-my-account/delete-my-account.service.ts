import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { DeleteMyAccountRequest } from './delete-my-account.models';

@Injectable({ providedIn: 'root' })
export class DeleteMyAccountService {
  private readonly http = inject(HttpClient);

  /** DELETE /api/profile/me (body bilan) */
  delete(body: DeleteMyAccountRequest): Observable<void> {
    return this.http.delete<void>(apiUrl('/profile/me'), {
      body,
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
