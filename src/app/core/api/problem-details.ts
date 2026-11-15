import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ProblemDetails, ProblemDetailsError } from './problem-details.model';

export function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'title' in value &&
    typeof (value as { status: unknown }).status === 'number'
  );
}

export function getProblemDetails(error: unknown): ProblemDetails | null {
  if (error instanceof HttpErrorResponse && isProblemDetails(error.error)) {
    return error.error;
  }
  return null;
}

/** FastEndpoints maydonga bog'lanmagan xatolarni "generalErrors" nomi bilan yuboradi. */
export function isGeneralError(item: ProblemDetailsError): boolean {
  return item.name.toLowerCase() === 'generalerrors';
}

/** Javobdagi maydonga bog'langan validatsiya xatolari (formada input ostida ko'rsatiladi). */
export function fieldErrors(error: unknown): ProblemDetailsError[] {
  const problem = getProblemDetails(error);
  return (problem?.errors ?? []).filter((e) => !isGeneralError(e));
}

/** Foydalanuvchiga ko'rsatiladigan umumiy xato matni. */
export function problemMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return "Server bilan aloqa yo'q. Internetni tekshirib, qayta urinib ko'ring.";
  }
  const problem = getProblemDetails(error);
  if (error instanceof HttpErrorResponse && error.status === 429 && !problem?.detail) {
    const retry = Number(error.headers.get('Retry-After'));
    return retry > 0
      ? `Juda ko'p urinish. ${retry < 60 ? retry + ' soniyadan' : Math.ceil(retry / 60) + ' daqiqadan'} keyin qayta urinib ko'ring.`
      : "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.";
  }
  if (problem) {
    const general = problem.errors?.filter(isGeneralError).map((e) => e.reason);
    if (general?.length) return general.join(' ');
    return problem.detail ?? problem.title;
  }
  return "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
}

/**
 * ProblemDetails.errors ni formadagi tegishli control'larga "server" xatosi sifatida yozadi.
 * Formada topilmagan xatolar qaytariladi (ularni toast orqali ko'rsatish mumkin).
 */
export function applyServerErrors(form: FormGroup, error: unknown): ProblemDetailsError[] {
  const problem = getProblemDetails(error);
  const unmatched: ProblemDetailsError[] = [];
  for (const item of (problem?.errors ?? []).filter((e) => !isGeneralError(e))) {
    const control = findControl(form, item.name);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: item.reason });
      control.markAsTouched();
    } else {
      unmatched.push(item);
    }
  }
  return unmatched;
}

function findControl(form: FormGroup, name: string): AbstractControl | null {
  const direct = form.get(name);
  if (direct) return direct;
  // Backend nomlari ba'zan PascalCase bo'lishi mumkin: "Login" → "login"
  const camel = name.charAt(0).toLowerCase() + name.slice(1);
  return form.get(camel);
}

/**
 * Forma yuborilganda kelgan xatoni qayta ishlaydi: maydon xatolari input ostiga yoziladi,
 * qolgani (umumiy xatolar, formada topilmagan maydonlar, tarmoq xatosi) matn sifatida qaytadi —
 * uni forma ichidagi <app-alert> da ko'rsating. Bunday so'rovlar SKIP_ERROR_TOAST bilan yuboriladi.
 */
export function handleFormError(form: FormGroup, error: unknown): string | null {
  const unmatched = applyServerErrors(form, error);
  const problem = getProblemDetails(error);
  const general = (problem?.errors ?? []).filter(isGeneralError).map((e) => e.reason);
  const messages = [...general, ...unmatched.map((e) => e.reason)];
  if (messages.length) return messages.join(' ');
  if (fieldErrors(error).length) return null;
  return problemMessage(error);
}
