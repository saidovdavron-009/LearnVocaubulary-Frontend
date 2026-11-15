import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Talaffuzni eshittiruvchi yumaloq tugma (lug'at kartochkalari, kunning so'zi).
 * audioUrl bo'lmasa, `text` berilgan bo'lsa brauzer nutq sintezi (speechSynthesis) ishlatiladi;
 * ikkalasi ham bo'lmasa tugma ko'rinmaydi.
 */
@Component({
  selector: 'app-audio-button',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (available()) {
      <button
        type="button"
        class="flex items-center justify-center rounded-full transition-[translate,box-shadow,background-color] duration-150 active:translate-y-0.5"
        [class]="classes()"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [attr.aria-label]="label()"
        [attr.aria-pressed]="playing()"
        (click)="play($event)"
      >
        <app-icon name="speaker" [size]="iconSize()" />
      </button>
    }
  `,
})
export class AudioButton {
  readonly src = input<string | null>(null);
  readonly size = input(36);
  /** soft — kartochkalarda, dark — kunning so'zi banneri, violet — katta kartochka. */
  readonly tone = input<'soft' | 'dark' | 'violet'>('soft');
  readonly label = input('Talaffuzni tinglash');
  /** Audio fayl bo'lmaganda o'qiladigan matn. */
  readonly text = input<string | null>(null);
  /** Nutq sintezi tili (ISO kodi, masalan "en"). */
  readonly lang = input('en');

  private readonly canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  protected readonly available = computed(() => !!this.src() || (this.canSpeak && !!this.text()?.trim()));

  protected readonly playing = signal(false);
  protected readonly iconSize = computed(() => Math.round(this.size() * 0.45));
  protected readonly classes = computed(() => {
    switch (this.tone()) {
      case 'dark':
        return 'bg-ink text-fg-inverse shadow-hard shadow-black active:shadow-hard-sm';
      case 'violet':
        return 'bg-violet text-fg-inverse shadow-hard shadow-violet-deep active:shadow-hard-sm';
      default:
        return 'bg-violet-soft text-violet-text hover:bg-line';
    }
  });

  protected play(event: Event): void {
    event.stopPropagation();
    const url = this.src();
    if (this.playing()) return;
    if (!url) {
      this.speak();
      return;
    }
    const audio = new Audio(url);
    this.playing.set(true);
    audio.onended = audio.onerror = () => this.playing.set(false);
    void audio.play().catch(() => this.playing.set(false));
  }

  private speak(): void {
    const text = this.text()?.trim();
    if (!text || !this.canSpeak) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang();
    utterance.rate = 0.9;
    utterance.onend = utterance.onerror = () => this.playing.set(false);
    this.playing.set(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
