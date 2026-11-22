import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { IconName } from '../../../shared/ui/icon/icons';

export interface GameRule {
  icon: IconName;
  text: string;
  tone?: 'mint' | 'coral' | 'violet';
}

/** O'yin boshlanishidan oldingi kartochka: nomi, qoidalari va "Boshlash" tugmasi. */
@Component({
  selector: 'app-game-intro',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pop-in flex w-full max-w-130 flex-col items-center gap-6 rounded-3xl border-2 border-line bg-surface p-6 text-center sm:p-8">
      <span class="flex size-20 items-center justify-center rounded-full" [class]="iconClass()">
        <app-icon [name]="icon()" [size]="40" />
      </span>
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-h2 text-fg sm:text-h1">{{ title() }}</h1>
        <p class="text-body-lg text-fg-secondary">{{ text() }}</p>
      </div>
      <ul class="flex w-full flex-col gap-2 text-left text-body text-fg-secondary">
        @for (rule of rules(); track rule.text) {
          <li class="flex gap-2">
            <app-icon
              [name]="rule.icon"
              [size]="20"
              class="shrink-0"
              [class]="rule.tone === 'coral' ? 'text-coral-strong' : rule.tone === 'violet' ? 'text-violet-text' : 'text-mint'"
            />
            {{ rule.text }}
          </li>
        }
      </ul>
      <ng-content />
      <button appButton type="button" size="l" variant="yellow" icon="play" [block]="true" (click)="start.emit()">Boshlash</button>
    </section>
  `,
})
export class GameIntro {
  readonly title = input.required<string>();
  readonly text = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly iconClass = input('bg-yellow text-fg');
  readonly rules = input<GameRule[]>([]);
  readonly start = output();
}
