import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { WordStatus } from '../../../core/api/enums';

const STATUS: Record<WordStatus, { label: string; box: string; dot: string }> = {
  new: { label: 'Yangi', box: 'bg-blue-soft text-blue-text', dot: 'bg-blue' },
  learning: { label: "O'rganilmoqda", box: 'bg-yellow-soft text-yellow-text', dot: 'bg-yellow' },
  review: { label: 'Takrorlash', box: 'bg-violet-soft text-violet-text', dot: 'bg-violet' },
  mastered: { label: "O'zlashtirildi", box: 'bg-mint-soft text-mint-text', dot: 'bg-mint' },
};

/** Figma: Badge/Status — so'z holati, oldida nuqta bilan. */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.75 py-1.25 text-label ' + config().box",
  },
  template: `
    <span class="size-2 shrink-0 rounded-full" [class]="config().dot" aria-hidden="true"></span>
    {{ config().label }}
  `,
})
export class Badge {
  readonly status = input.required<WordStatus>();
  protected readonly config = computed(() => STATUS[this.status()]);
}
