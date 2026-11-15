import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Yuklanish holati uchun bo'sh blok. O'lcham va shakl class orqali beriladi:
 * <app-skeleton class="h-6 w-40" />  <app-skeleton class="size-10 rounded-full" />
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'skeleton block rounded-md bg-muted', 'aria-hidden': 'true' },
  template: ``,
})
export class Skeleton {}
