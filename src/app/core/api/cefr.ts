import { CefrLevel } from './enums';

export interface CefrLevelInfo {
  value: CefrLevel;
  /** "A2" */
  code: string;
  /** "Elementar" */
  title: string;
  /** Qisqa tavsif — onboarding kartalari uchun. */
  description: string;
}

/** CEFR darajalari (A1 → C2), tartib muhim: keyingi daraja shu ro'yxat bo'yicha olinadi. */
export const CEFR_LEVELS: readonly CefrLevelInfo[] = [
  { value: 'a1', code: 'A1', title: "Boshlang'ich", description: "Endi boshlayapman, oddiy so'z va iboralar" },
  { value: 'a2', code: 'A2', title: 'Elementar', description: "Kundalik mavzularda sodda gaplar tuza olaman" },
  { value: 'b1', code: 'B1', title: "O'rta", description: "Tanish mavzularda erkin gaplasha olaman" },
  { value: 'b2', code: 'B2', title: "O'rtadan yuqori", description: "Murakkab matnlarni tushunaman, ravon so'zlashaman" },
  { value: 'c1', code: 'C1', title: "Yuqori", description: "Ilmiy va kasbiy mavzularda erkin fikr bildiraman" },
  { value: 'c2', code: 'C2', title: 'Mukammal', description: "Tilni deyarli ona tilidek bilaman" },
];

export function cefrInfo(level: CefrLevel | null | undefined): CefrLevelInfo | undefined {
  return CEFR_LEVELS.find((l) => l.value === level);
}

/**
 * Backend darajani katta harfda ("A2") yoki kichik harfda ("a2") qaytarishi mumkin —
 * har doim kichik harfli CefrLevel'ga keltiramiz.
 */
export function toCefrLevel(value: string | null | undefined): CefrLevel | null {
  const v = value?.toLowerCase();
  return CEFR_LEVELS.some((l) => l.value === v) ? (v as CefrLevel) : null;
}

/** Darajadan o'tish xabari (SubmitAnswerResponse.levelUp / GetStudyQueueResponse.levelUp). */
export interface LevelUp {
  from: CefrLevel;
  /** null — oxirgi daraja (C2) ham tugatildi. */
  to: CefrLevel | null;
  wordsLearned: number;
}
