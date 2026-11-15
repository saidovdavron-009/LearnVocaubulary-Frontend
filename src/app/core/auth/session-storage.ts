import { AuthSession } from './auth.models';

const STORAGE_KEY = 'sozchi.session';

/**
 * "Meni eslab qol" belgilansa seans localStorage'da (brauzer yopilsa ham saqlanadi),
 * aks holda sessionStorage'da (tab yopilganda o'chadi) saqlanadi.
 */
export interface StoredSession {
  session: AuthSession;
  remember: boolean;
}

function storage(remember: boolean): Storage | null {
  try {
    return remember ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function readFrom(remember: boolean): AuthSession | null {
  try {
    const raw = storage(remember)?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (Date.parse(session.refreshTokenExpiresAt) <= Date.now()) {
      storage(remember)?.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function readSession(): StoredSession | null {
  const remembered = readFrom(true);
  if (remembered) return { session: remembered, remember: true };
  const temporary = readFrom(false);
  if (temporary) return { session: temporary, remember: false };
  return null;
}

export function writeSession(value: StoredSession | null): void {
  try {
    storage(true)?.removeItem(STORAGE_KEY);
    storage(false)?.removeItem(STORAGE_KEY);
    if (value) storage(value.remember)?.setItem(STORAGE_KEY, JSON.stringify(value.session));
  } catch {
    // Storage mavjud bo'lmasa (private rejim) seans faqat xotirada qoladi.
  }
}
