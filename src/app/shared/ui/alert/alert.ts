import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** Forma ichidagi xabar bloki (masalan, "Login yoki parol noto'g'ri."). */
@Component({
  selector: 'app-alert',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.role]': "kind() === 'error' ? 'alert' : 'status'",
  },
  template: `
    <app-icon [name]="kind() === 'error' ? 'alert' : kind() === 'success' ? 'check' : 'lightbulb'" [size]="18" class="mt-0.5" />
    <p class="flex-1 text-body font-semibold"><ng-content /></p>
  `,
})
export class Alert {
  readonly kind = input<'error' | 'success' | 'info'>('error');
  protected readonly classes = computed(() => {
    const color =
      this.kind() === 'error'
        ? 'bg-coral-soft text-coral-text'
        : this.kind() === 'success'
          ? 'bg-mint-soft text-mint-text'
          : 'bg-violet-soft text-violet-text';
    return 'flex items-start gap-2.5 rounded-input px-4 py-3 ' + color;
  });
}
