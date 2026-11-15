import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { AddMyWordRequest, AddMyWordResponse } from './add-my-word.models';

@Injectable({ providedIn: 'root' })
export class AddMyWordService {
  private readonly http = inject(HttpClient);

  /** POST /api/my-words — so'z allaqachon qo'shilgan bo'lsa 409 qaytadi. */
  add(body: AddMyWordRequest): Observable<AddMyWordResponse> {
    return this.http.post<AddMyWordResponse>(apiUrl('/my-words'), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
