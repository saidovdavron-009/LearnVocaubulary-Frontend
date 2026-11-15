import { SelectOption } from './select';

/** Eslatma vaqti tanlagichi uchun: 06:00 dan 23:30 gacha har 30 daqiqa. Qiymat backend formatida ("HH:mm:ss"). */
export const REMINDER_TIME_OPTIONS: SelectOption<string>[] = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return { value: `${hh}:${mm}:00`, label: `${hh}:${mm}` };
});

/** "20:00" yoki "20:00:00" → "20:00:00" (ro'yxatdagi qiymat bilan solishtirish uchun). */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const [hh = '00', mm = '00'] = value.split(':');
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
}
