const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

/** "Chorshanba, 28-oktabr" */
export function formatUzDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()}-${MONTHS[date.getMonth()]}`;
}

/** 2340 → "2 340" (dizayndagidek bo'shliq bilan) */
export function formatNumber(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "2025-03-14T..." → "2025-yil martdan beri a'zo" */
export function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-yil ${MONTHS[date.getMonth()]}dan beri a'zo`;
}

/** Keyingi takrorlash vaqti: "Bugun, 18:00" / "Ertaga" / "12 kundan keyin" / "Hozir" / "—". */
export function formatNextReview(iso: string | null, now = new Date()): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (date.getTime() <= now.getTime()) return 'Hozir';
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (days === 0) {
    return `Bugun, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  if (days === 1) return 'Ertaga';
  return `${days} kundan keyin`;
}

/** Nisbiy vaqt: "Hozir" / "5 daqiqa oldin" / "2 soat oldin" / "Kecha" / "12 kun oldin" / "—". */
export function formatRelative(iso: string | null, now = new Date()): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 2) return 'Hozir';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days === 0) return `${Math.floor(minutes / 60)} soat oldin`;
  if (days === 1) return 'Kecha';
  return `${days} kun oldin`;
}
