import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { REFRESH_URL } from '../auth/auth.service';
import { fieldErrors, problemMessage } from '../api/problem-details';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SKIP_ERROR_TOAST } from './http-context';

/**
 * Backend xatolarini ushlaydi. Maydonga bog'langan validatsiya xatolari (400 + errors)
 * formada input ostida ko'rsatiladi, shuning uchun ular toast qilinmaydi.
 * Qolgan barcha xatolar toast orqali chiqadi.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && shouldToast(error, req.url, req.context.get(SKIP_ERROR_TOAST))) {
        toast.error(problemMessage(error));
      }
      return throwError(() => error);
    }),
  );
};

function shouldToast(error: HttpErrorResponse, url: string, skip: boolean): boolean {
  if (skip) return false;
  // 401 — authInterceptor refresh qiladi yoki /login'ga yuboradi.
  if (error.status === 401 || url === REFRESH_URL) return false;
  // Faqat maydon xatolaridan iborat javob (400 validatsiya, 409 band email va h.k.) — formada ko'rsatiladi.
  const errors = fieldErrors(error);
  const all = (error.error as { errors?: unknown[] } | null)?.errors?.length ?? 0;
  if (errors.length > 0 && errors.length === all) return false;
  return true;
}
