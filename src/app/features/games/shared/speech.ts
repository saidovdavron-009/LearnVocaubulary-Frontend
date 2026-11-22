/** Brauzer ovozi (speechSynthesis) — bepul, internet talab qilmaydi. */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Inglizcha matnni ovozda o'qiydi; `slow` — sekinroq. Tugaganda `onEnd` chaqiriladi. */
export function speak(text: string, slow = false, onEnd?: () => void): void {
  if (!canSpeak) {
    onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = slow ? 0.55 : 0.9;
  u.onend = u.onerror = () => onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}
