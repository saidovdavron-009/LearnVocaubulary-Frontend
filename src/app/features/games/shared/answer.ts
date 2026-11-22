/** Javobni solishtirish uchun: kichik harf, apostroflar bir xil, ortiqcha bo'shliqlarsiz. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`ʻʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein masofasi (kichik imlo xatolarini kechirish uchun). */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Faqat lotin harflaridan iborat bitta so'z (krossvord, harf o'yinlari uchun). */
export function isPlainWord(text: string, min = 3, max = 10): boolean {
  return new RegExp(`^[a-z]{${min},${max}}$`).test(text.trim().toLowerCase());
}
