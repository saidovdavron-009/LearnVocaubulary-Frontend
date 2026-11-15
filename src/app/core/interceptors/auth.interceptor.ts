import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { isApiRequest } from '../api/api-url';
import { AuthService, REFRESH_URL } from '../auth/auth.service';
import { SKIP_AUTH } from './http-context';

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Har bir backend so'roviga access tokenni qo'shadi. 401 kelsa tokenni bir marta
 * yangilab, so'rovni qayta yuboradi; refresh ham muvaffaqiyatsiz bo'lsa — /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!isApiRequest(req.url) || req.url === REFRESH_URL || req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const token = auth.accessToken();
  const request = token ? withToken(req, token) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token) {
        return throwError(() => error);
      }
      // Bu so'rov ketgandan keyin token allaqachon yangilangan bo'lsa — qayta refresh shart emas.
      const latest = auth.accessToken();
      if (latest && latest !== token) {
        return next(withToken(req, latest));
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          auth.endSession(router.url);
          return throwError(() => refreshError);
        }),
        switchMap((newToken) => next(withToken(req, newToken))),
      );
    }),
  );
};
