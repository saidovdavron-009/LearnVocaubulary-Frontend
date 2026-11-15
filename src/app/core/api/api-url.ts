import { environment } from '../../../environments/environment';

/** Backend API prefiksi: development'da "/api" (proxy), production'da to'liq manzil. */
export const API_URL = environment.apiUrl;

/** "/auth/sign-in" → "<API_URL>/auth/sign-in" */
export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** So'rov shu backend'ga yuborilayotganini tekshiradi (token faqat shunda qo'shiladi). */
export function isApiRequest(url: string): boolean {
  return url.startsWith(API_URL);
}
