import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<Toast[]>([]);
  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  private show(kind: ToastKind, message: string, durationMs = 4500): void {
    // Bir xil xabar ketma-ket kelsa (masalan parallel so'rovlar), takrorlanmaydi.
    if (this.items().some((t) => t.message === message && t.kind === kind)) return;
    const id = this.nextId++;
    this.items.update((list) => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
