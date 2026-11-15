import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { getProblemDetails } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { AudioButton } from '../../../../../shared/ui/audio-button/audio-button';
import { Badge } from '../../../../../shared/ui/badge/badge';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { Menu } from '../../../../../shared/ui/menu/menu';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Table } from '../../../../../shared/ui/table/table';
import { Tag } from '../../../../../shared/ui/tag/tag';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { RemoveDeckWord } from '../../../deck-words/public/remove-deck-word/remove-deck-word';
import { DeleteMyDeck } from '../delete-my-deck/delete-my-deck';
import { StartDeck } from '../start-deck/start-deck';
import { StopDeck } from '../stop-deck/stop-deck';
import { UpdateMyDeck } from '../update-my-deck/update-my-deck';
import { GetOneDeckService } from './get-one-deck.service';

/** Figma: 09 To'plam ichi — hero, progress (holatlar bo'yicha), to'plamdagi so'zlar jadvali. */
@Component({
  selector: 'app-get-one-deck',
  imports: [
    RouterLink,
    AudioButton,
    Badge,
    Button,
    Icon,
    Menu,
    Skeleton,
    EmptyState,
    ErrorState,
    Table,
    Tag,
    RemoveDeckWord,
    DeleteMyDeck,
    StartDeck,
    StopDeck,
    UpdateMyDeck,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './get-one-deck.html',
})
export class GetOneDeck {
  private readonly service = inject(GetOneDeckService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route parametri: /decks/:id */
  readonly id = input.required<string>();
  private readonly deckId = computed(() => Number(this.id()));

  protected readonly formatNumber = formatNumber;
  protected readonly search = signal('');
  /** Shu sahifada olib tashlangan so'zlar. */
  private readonly removed = signal<Set<number>>(new Set());

  protected readonly deck = rxResource({
    params: () => ({ id: this.deckId() }),
    stream: ({ params }) => this.service.deck(params.id),
  });
  protected readonly words = rxResource({
    params: () => ({ id: this.deckId() }),
    stream: ({ params }) => this.service.allWords(params.id),
  });

  protected readonly deckValue = computed(() => (this.deck.hasValue() ? this.deck.value() : null));
  protected readonly notFound = computed(() => getProblemDetails(this.deck.error())?.status === 404);

  private readonly allWords = computed(() =>
    (this.words.hasValue() ? this.words.value().words : []).filter((w) => !this.removed().has(w.wordId)),
  );

  protected readonly filteredWords = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.allWords();
    return this.allWords().filter(
      (w) => w.text.toLowerCase().includes(q) || (w.primaryTranslation ?? '').toLowerCase().includes(q),
    );
  });

  /** Progress kartasi: so'zlar holat bo'yicha (mening so'zlarimda yo'qlari "Yangi"ga kiradi). */
  protected readonly breakdown = computed(() => {
    const counts = { mastered: 0, review: 0, learning: 0, new: 0 };
    for (const w of this.allWords()) counts[w.myStatus ?? 'new']++;
    return [
      { key: 'mastered', label: "O'zlashtirildi", count: counts.mastered, color: 'bg-mint' },
      { key: 'review', label: 'Takrorlash', count: counts.review, color: 'bg-violet' },
      { key: 'learning', label: "O'rganilmoqda", count: counts.learning, color: 'bg-yellow' },
      { key: 'new', label: 'Yangi', count: counts.new, color: 'bg-line-strong' },
    ];
  });

  constructor() {
    effect(() => {
      const d = this.deckValue();
      untracked(() => {
        if (d) {
          const owner = d.isMine ? 'Siz' : d.ownerUsername ? `${d.ownerUsername} tomonidan` : "So'zchi jamoasi";
          this.shell.setPageHeader(`To'plamlar › ${d.title}`, `${owner} · ${d.isPublic ? 'Ommaviy' : 'Shaxsiy'}`);
        } else {
          this.shell.setPageHeader("To'plamlar");
        }
      });
    });
  }

  protected reloadAll(): void {
    this.deck.reload();
    this.words.reload();
  }

  protected onRemoved(wordId: number): void {
    this.removed.update((s) => new Set(s).add(wordId));
    this.deck.reload();
  }

  protected async copyLink(): Promise<void> {
    const url = window.location.origin + this.router.url;
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Havola nusxalandi');
    } catch {
      this.toast.info(url);
    }
  }
}
