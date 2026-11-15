import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

let nextId = 0;

/**
 * Ikonkali tugma + ochiladigan menyu ("…"). Bandlar ng-content orqali (role="menuitem" tugmalar).
 * Tashqariga bosilganda, Esc yoki band tanlanganda yopiladi.
 */
@Component({
  selector: 'app-menu',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-flex',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
  template: `
    <button
      type="button"
      class="flex items-center justify-center rounded-input transition-colors"
      [class]="triggerClass()"
      [attr.aria-label]="label()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="id"
      (click)="open.set(!open())"
    >
      <app-icon [name]="icon()" [size]="20" />
    </button>
    <div
      [id]="id"
      role="menu"
      class="absolute top-full right-0 z-30 mt-2 flex min-w-56 flex-col rounded-xl border-2 border-line bg-surface p-1.5 shadow-card"
      [class.hidden]="!open()"
      (click)="onItemClick($event)"
    >
      <ng-content />
    </div>
  `,
})
export class Menu {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly label = input('Boshqa amallar');
  readonly icon = input<IconName>('more');
  readonly triggerClass = input('size-12 bg-surface text-fg hover:bg-muted');

  protected readonly id = `app-menu-${nextId++}`;
  protected readonly open = signal(false);

  close(): void {
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected onItemClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('[role="menuitem"]')) this.close();
  }
}
