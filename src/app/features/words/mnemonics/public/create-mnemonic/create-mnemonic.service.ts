import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { CreateMnemonicRequest, CreateMnemonicResponse } from './create-mnemonic.models';

@Injectable({ providedIn: 'root' })
export class CreateMnemonicService {
  private readonly http = inject(HttpClient);

  /** POST /api/words/{wordId}/mnemonics */
  create(wordId: number, body: CreateMnemonicRequest): Observable<CreateMnemonicResponse> {
    return this.http.post<CreateMnemonicResponse>(apiUrl(`/words/${wordId}/mnemonics`), body, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
