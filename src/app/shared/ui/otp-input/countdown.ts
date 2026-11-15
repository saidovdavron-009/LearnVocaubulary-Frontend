import { computed, DestroyRef, inject, signal } from '@angular/core';

/**
 * "Qayta yuborish (0:42)" uchun teskari sanoq. Komponent konstruktorida chaqiriladi.
 *   readonly resend = createCountdown();  resend.start(60);  resend.label() → "0:42"
 */
export function createCountdown() {
  const seconds = signal(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  inject(DestroyRef).onDestroy(stop);

  return {
    seconds: seconds.asReadonly(),
    running: computed(() => seconds() > 0),
    label: computed(() => {
      const s = seconds();
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }),
    start(total: number): void {
      stop();
      seconds.set(Math.max(0, Math.ceil(total)));
      if (seconds() === 0) return;
      timer = setInterval(() => {
        seconds.update((v) => v - 1);
        if (seconds() <= 0) stop();
      }, 1000);
    },
  };
}
