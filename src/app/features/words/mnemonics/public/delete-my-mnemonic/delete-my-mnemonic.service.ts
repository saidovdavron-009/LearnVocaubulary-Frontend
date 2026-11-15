import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';

@Injectable({ providedIn: 'root' })
export class DeleteMyMnemonicService {
  private readonly http = inject(HttpClient);

  /** DELETE /api/mnemonics/{id} — 204 (faqat o'z usulim). */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/mnemonics/${id}`));
  }
}
