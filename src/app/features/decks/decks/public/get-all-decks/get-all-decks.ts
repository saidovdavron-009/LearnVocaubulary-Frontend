import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CefrLevel, DeckScope } from '../../../../../core/api/enums';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Button } from '../../../../../shared/ui/button/button';
import { DeckCover } from '../../../../../shared/ui/deck-cover/deck-cover';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { ProgressBar } from '../../../../../shared/ui/progress/progress-bar';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tab } from '../../../../../shared/ui/tab/tab';
import { CreateMyDeck } from '../create-my-deck/create-my-deck';
import { StartDeck } from '../start-deck/start-deck';
import { DeckListItem } from './get-all-decks.models';
import { GetAllDecksService } from './get-all-decks.service';

const PAGE_SIZE = 12;
const SCOPES: { scope: DeckScope; label: string }[] = [
  { scope: 'all', label: 'Barchasi' },
  { scope: 'mine', label: 'Mening' },
  { scope: 'started', label: 'Boshlanganlar' },
  { scope: 'public', label: 'Ommaviy' },
];
const LEVELS: CefrLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

/**
 * Figma: 08 To'plamlar — scope tablari (hisoblagich bilan), daraja filtri, "Yangi to'plam",
 * "Haftaning to'plami" banneri (GET /api/decks/featured), to'plam kartochkalari.
 */
@Component({
  selector: 'app-get-all-decks',
  imports: [
    RouterLink,
    Button,
    DeckCover,
    Icon,
    ProgressBar,
    Skeleton,
    EmptyState,
    ErrorState,
    Tab,
    CreateMyDeck,
    StartDeck,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './get-all-decks.html',
})
export class GetAllDecks {
  private readonly service = inject(GetAllDecksService);
  private readonly shell = inject(AppShellService);

  protected readonly scopes = SCOPES;
  protected readonly levels = LEVELS;
  protected readonly formatNumber = formatNumber;

  protected readonly scope = signal<DeckScope>('all');
  protected readonly level = signal<CefrLevel | null>(null);
  protected readonly page = signal(1);
  /** "Ko'proq yuklash" bilan qo'shilgan keyingi sahifalar. */
  protected readonly more = signal<DeckListItem[]>([]);
  protected readonly loadingMore = signal(false);
  protected readonly hasNextOverride = signal<boolean | null>(null);
  /** Shu sahifada boshlangan to'plamlar (kartochka darhol "Davom etish"ga o'tadi). */
  protected readonly startedHere = signal<Set<number>>(new Set());

  protected readonly decks = rxResource({
    params: () => ({ scope: this.scope(), level: this.level() }),
    stream: ({ params }) =>
      this.service.getAll({ scope: params.scope, cefrLevel: params.level, page: 1, pageSize: PAGE_SIZE }),
  });

  protected readonly featured = rxResource({ stream: () => this.service.featured() });

  protected readonly counts = rxResource({
    params: () => ({ level: this.level() }),
    stream: ({ params }) => this.service.counts(SCOPES.map((s) => s.scope), params.level),
  });

  protected readonly items = computed(() => [...(this.decks.hasValue() ? this.decks.value().data : []), ...this.more()]);
  protected readonly hasNext = computed(
    () => this.hasNextOverride() ?? (this.decks.hasValue() ? this.decks.value().hasNext : false),
  );

  constructor() {
    this.shell.setPageHeader("To'plamlar", "Tayyor va o'zingiz yaratgan so'z to'plamlari");
  }

  protected setScope(scope: DeckScope): void {
    this.resetPaging();
    this.scope.set(scope);
  }

  protected setLevel(level: CefrLevel | null): void {
    this.resetPaging();
    this.level.set(this.level() === level ? null : level);
  }

  protected countFor(scope: DeckScope): number | null {
    return this.counts.hasValue() ? (this.counts.value()[scope] ?? null) : null;
  }

  protected isStarted(deck: DeckListItem): boolean {
    return deck.isStarted || this.startedHere().has(deck.id);
  }

  protected onStarted(deckId: number): void {
    this.startedHere.update((s) => new Set(s).add(deckId));
    this.counts.reload();
  }

  protected owner(deck: DeckListItem): string {
    if (deck.isMine) return 'Siz';
    return deck.ownerUsername ?? "So'zchi jamoasi";
  }

  protected loadMore(): void {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    const next = this.page() + 1;
    this.service
      .getAll({ scope: this.scope(), cefrLevel: this.level(), page: next, pageSize: PAGE_SIZE })
      .subscribe({
        next: (res) => {
          this.more.update((list) => [...list, ...res.data]);
          this.page.set(next);
          this.hasNextOverride.set(res.hasNext);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }

  private resetPaging(): void {
    this.page.set(1);
    this.more.set([]);
    this.hasNextOverride.set(null);
  }
}
