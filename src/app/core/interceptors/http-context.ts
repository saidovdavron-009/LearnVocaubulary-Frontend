import { HttpContextToken } from '@angular/common/http';

/** true bo'lsa errorInterceptor bu so'rov xatosi uchun toast chiqarmaydi (komponent o'zi ko'rsatadi). */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** true bo'lsa authInterceptor bu so'rovga token qo'shmaydi va 401'da refresh qilmaydi. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
