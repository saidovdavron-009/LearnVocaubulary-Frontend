import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { CreateReportRequest, CreateReportResponse } from './create-report.models';

@Injectable({ providedIn: 'root' })
export class CreateReportService {
  private readonly http = inject(HttpClient);

  /** POST /api/words/{wordId}/reports — xatolar formada ko'rsatiladi. */
  create(wordId: number, body: CreateReportRequest): Observable<CreateReportResponse> {
    return this.http.post<CreateReportResponse>(apiUrl(`/words/${wordId}/reports`), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
