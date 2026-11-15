import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  /** Asosiy savol; `subject` berilsa, u qalin qilib ajratib ko'rsatiladi. */
  message?: string | null;
  /** Ajratib ko'rsatiladigan nom, masalan "@dilnoza_a". */
  subject?: string | null;
  confirmText?: string;
  cancelText?: string;
  /** danger — qizil tasdiqlash tugmasi (bloklash, o'chirish). */
  tone?: 'danger' | 'primary';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Brauzerning confirm() oynasi o'rniga sayt dizaynidagi tasdiqlash oynasi.
 *   if (!(await this.confirm.ask({ title: 'Bloklash', subject: '@ali', ... }))) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    // Oldingi ochiq so'rov bo'lsa — bekor qilingan deb hisoblanadi.
    this.current()?.resolve(false);
    return new Promise((resolve) => this.current.set({ ...options, resolve }));
  }

  close(ok: boolean): void {
    const req = this.current();
    if (!req) return;
    this.current.set(null);
    req.resolve(ok);
  }
}
