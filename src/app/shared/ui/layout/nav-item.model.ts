import { IconName } from '../icon/icons';

export interface NavItem {
  label: string;
  icon: IconName;
  link: string;
  /** Qizil hisoblagich (masalan, o'qilmagan bildirishnomalar). 0 yoki null bo'lsa ko'rinmaydi. */
  badge?: number | null;
}
