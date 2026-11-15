import { ValidationErrors } from '@angular/forms';

/** Validator xatosini o'zbekcha matnga aylantiradi. "server" — backend ProblemDetails xatosi. */
export function controlErrorText(
  errors: ValidationErrors | null,
  overrides: Record<string, string> = {},
): string | null {
  if (!errors) return null;
  const key = Object.keys(errors)[0];
  if (!key) return null;
  if (overrides[key]) return overrides[key];

  const value: unknown = errors[key];
  switch (key) {
    case 'server':
      return typeof value === 'string' ? value : 'Qiymat noto‘g‘ri';
    case 'required':
      return 'Bu maydon to‘ldirilishi shart';
    case 'email':
      return 'Email manzil noto‘g‘ri';
    case 'minlength':
      return `Kamida ${(value as { requiredLength: number }).requiredLength} ta belgi bo‘lishi kerak`;
    case 'maxlength':
      return `Ko‘pi bilan ${(value as { requiredLength: number }).requiredLength} ta belgi bo‘lishi mumkin`;
    case 'min':
      return `Qiymat ${(value as { min: number }).min} dan kam bo‘lmasin`;
    case 'max':
      return `Qiymat ${(value as { max: number }).max} dan oshmasin`;
    case 'pattern':
      return 'Qiymat formati noto‘g‘ri';
    default:
      return 'Qiymat noto‘g‘ri';
  }
}
