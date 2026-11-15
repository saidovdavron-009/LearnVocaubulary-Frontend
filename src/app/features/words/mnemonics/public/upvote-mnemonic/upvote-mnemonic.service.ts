import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { MnemonicVoteResponse } from './upvote-mnemonic.models';

@Injectable({ providedIn: 'root' })
export class UpvoteMnemonicService {
  private readonly http = inject(HttpClient);

  /** POST /api/mnemonics/{id}/upvote */
  upvote(id: number): Observable<MnemonicVoteResponse> {
    return this.http.post<MnemonicVoteResponse>(apiUrl(`/mnemonics/${id}/upvote`), null);
  }

  /** DELETE /api/mnemonics/{id}/upvote */
  removeUpvote(id: number): Observable<MnemonicVoteResponse> {
    return this.http.delete<MnemonicVoteResponse>(apiUrl(`/mnemonics/${id}/upvote`));
  }
}
