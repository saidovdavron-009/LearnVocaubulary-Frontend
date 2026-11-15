import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WordStatus } from '../../../../../core/api/enums';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Badge } from '../../../../../shared/ui/badge/badge';
import { Button } from '../../../../../shared/ui/button/button';
import { Checkbox } from '../../../../../shared/ui/checkbox/checkbox';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { IconName } from '../../../../../shared/ui/icon/icons';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { Menu } from '../../../../../shared/ui/menu/menu';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Pagination } from '../../../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tab } from '../../../../../shared/ui/tab/tab';
import { ConfirmService } from '../../../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { RemoveMyWord } from '../remove-my-word/remove-my-word';
import { ResetMyWord } from '../reset-my-word/reset-my-word';
import { BulkMyWordsAction, MyDeckOption, MyWordItem, MyWordsSort, MyWordsTab } from './get-all-my-words.models';
import { GetAllMyWordsService } from './get-all-my-words.service';

const TABS: { id: MyWordsTab; label: string }[] = [
  { id: 'all', label: 'Hammasi' },
  { id: 'favorites', label: 'Sevimlilar' },
  { id: 'due', label: 'Bugun takror' },
  { id: 'hard', label: 'Qiyinlar' },
];

const STATUS_CARDS: { status: WordStatus; label: string; icon: IconName; box: string; text: string }[] = [
  { status: 'new', label: 'Yangi', icon: 'plus', box: 'bg-blue-soft', text: 'text-blue-text' },
  { status: 'learning', label: "O'rganilmoqda", icon: 'refresh', box: 'bg-yellow-soft', text: 'text-yellow-text' },
  { status: 'review', label: 'Takrorlash', icon: 'clock', box: 'bg-violet-soft', text: 'text-violet-text' },
  { status: 'mastered', label: "O'zlashtirildi", icon: 'check', box: 'bg-mint-soft', text: 'text-mint-text' },
];

const SORTS: { id: MyWordsSort; label: string }[] = [
  { id: 'next_review', label: 'Keyingi takror' },
  { id: 'newest', label: "Oxirgi qo'shilgan" },
  { id: 'text', label: 'Alifbo bo‘yicha' },
  { id: 'memory', label: 'Xotira kuchi' },
  { id: 'lapses', label: "Xatolar ko'p" },
];

/** Xotira chizig'i rangi holatga qarab (Figma: violet / mint / yellow). */
const MEMORY_COLOR: Record<WordStatus, string> = {
  new: 'bg-muted',
  learning: 'bg-yellow',
  review: 'bg-violet',
  mastered: 'bg-mint',
};

/**
 * Figma: 13 Mening so'zlarim — holat kartochkalari, tablar (hisoblagich bilan), qidiruv, saralash,
 * eksport (CSV), tanlangan so'zlar uchun ommaviy amallar, jadval va sahifalash.
 */
@Component({
  selector: 'app-get-all-my-words',
  imports: [
    RouterLink,
    Avatar,
    Badge,
    Button,
    Checkbox,
    Icon,
    Menu,
    Modal,
    Pagination,
    Skeleton,
    EmptyState,
    ErrorState,
    Tab,
    RemoveMyWord,
    ResetMyWord,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './get-all-my-words.html',
})
export class GetAllMyWords {
  private readonly service = inject(GetAllMyWordsService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  /** ?due=true (dashboard "Hammasi" havolasi). */
  readonly due = input<string | undefined>(undefined);

  protected readonly tabs = TABS;
  protected readonly statusCards = STATUS_CARDS;
  protected readonly sorts = SORTS;
  protected readonly memoryColor = MEMORY_COLOR;
  protected readonly formatNumber = formatNumber;

  protected readonly tab = signal<MyWordsTab>('all');
  protected readonly status = signal<WordStatus | null>(null);
  protected readonly search = signal('');
  protected readonly sortBy = signal<MyWordsSort>('next_review');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly selected = signal<Set<number>>(new Set());
  protected readonly busy = signal(false);
  protected readonly exporting = signal(false);
  protected readonly sortOpen = signal(false);

  protected readonly deckModalOpen = signal(false);
  protected readonly decks = signal<MyDeckOption[] | null>(null);

  private readonly search$ = new Subject<string>();

  protected readonly words = rxResource({
    params: () => ({
      tab: this.tab(),
      status: this.status(),
      search: this.search(),
      sortBy: this.sortBy(),
      page: this.page(),
      pageSize: this.pageSize(),
    }),
    stream: ({ params }) =>
      this.service.getAll({
        search: params.search.trim() || null,
        status: params.status,
        isFavorite: params.tab === 'favorites' ? true : null,
        dueToday: params.tab === 'due',
        hardOnly: params.tab === 'hard',
        sortBy: params.sortBy,
        page: params.page,
        pageSize: params.pageSize,
      }),
  });

  protected readonly counts = rxResource({ stream: () => this.service.counts() });

  protected readonly items = computed(() => (this.words.hasValue() ? this.words.value().data : []));
  protected readonly allSelected = computed(() => this.items().length > 0 && this.items().every((w) => this.selected().has(w.wordId)));
  protected readonly someSelected = computed(() => this.selected().size > 0 && !this.allSelected());

  constructor() {
    if (this.due() === 'true') this.tab.set('due');
    effect(() => {
      if (this.due() === 'true') untracked(() => this.tab.set('due'));
    });

    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((q) => {
      this.page.set(1);
      this.search.set(q);
    });

    // Sarlavha: "248 ta so'z · 24 tasi bugun takrorlanadi"
    effect(() => {
      const c = this.counts.hasValue() ? this.counts.value() : null;
      const subtitle = c?.['all'] !== null && c?.['all'] !== undefined
        ? `${formatNumber(c['all'])} ta so'z · ${c['due'] ?? 0} tasi bugun takrorlanadi`
        : null;
      untracked(() => this.shell.setPageHeader("Mening so'zlarim", subtitle));
    });
  }

  protected count(key: string): number | null {
    return this.counts.hasValue() ? (this.counts.value()[key] ?? null) : null;
  }

  protected setTab(tab: MyWordsTab): void {
    this.tab.set(tab);
    this.page.set(1);
    this.clearSelection();
  }

  protected toggleStatus(status: WordStatus): void {
    this.status.set(this.status() === status ? null : status);
    this.page.set(1);
    this.clearSelection();
  }

  protected onSearch(event: Event): void {
    this.search$.next((event.target as HTMLInputElement).value);
  }

  protected setSort(sort: MyWordsSort): void {
    this.sortBy.set(sort);
    this.sortOpen.set(false);
    this.page.set(1);
  }

  protected setPage(page: number): void {
    this.page.set(page);
    this.clearSelection();
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.clearSelection();
  }

  protected toggle(wordId: number, checked: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (checked) next.add(wordId);
      else next.delete(wordId);
      return next;
    });
  }

  protected toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.items().map((w) => w.wordId)) : new Set());
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected async bulk(action: BulkMyWordsAction): Promise<void> {
    const ids = [...this.selected()];
    if (!ids.length || this.busy()) return;
    if (action === 'remove') {
      const ok = await this.confirm.ask({
        title: "So'zlarni o'chirish",
        subject: `${ids.length} ta so'z`,
        message: "ni mening so'zlarimdan o'chirasizmi? Ularning progressi ham o'chadi.",
        confirmText: "Ha, o'chirish",
      });
      if (!ok) return;
    }
    this.busy.set(true);
    this.service.bulk(ids, action).subscribe({
      next: (res) => {
        this.busy.set(false);
        const labels: Record<BulkMyWordsAction, string> = {
          favorite: "sevimlilarga qo'shildi",
          unfavorite: 'sevimlilardan olindi',
          reset: 'qayta boshlandi',
          remove: "o'chirildi",
        };
        this.toast.success(`${res.affected} ta so'z ${labels[action]}`);
        this.clearSelection();
        this.reloadAll();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.error(problemMessage(err));
      },
    });
  }

  protected toggleFavorite(w: MyWordItem): void {
    this.selected.set(new Set([w.wordId]));
    this.bulk(w.isFavorite ? 'unfavorite' : 'favorite');
  }

  protected openDeckModal(): void {
    this.deckModalOpen.set(true);
    if (this.decks() === null) {
      this.service.myDecks().subscribe({
        next: (d) => this.decks.set(d),
        error: () => this.decks.set([]),
      });
    }
  }

  protected addToDeck(deck: MyDeckOption): void {
    const ids = [...this.selected()];
    this.busy.set(true);
    this.service.addToDeck(deck.id, ids).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.deckModalOpen.set(false);
        this.toast.success(`«${deck.title}» to'plamiga ${res.added} ta so'z qo'shildi`);
        this.decks.set(null);
        this.clearSelection();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.error(problemMessage(err));
      },
    });
  }

  /** CSV eksport: joriy filtrga mos barcha so'zlar. */
  protected export(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.service
      .getAllPages({
        search: this.search().trim() || null,
        status: this.status(),
        isFavorite: this.tab() === 'favorites' ? true : null,
        dueToday: this.tab() === 'due',
        hardOnly: this.tab() === 'hard',
        sortBy: this.sortBy(),
      })
      .subscribe({
        next: (all) => {
          this.exporting.set(false);
          const head = ["So'z", 'Transkripsiya', 'Tarjima', "To'plam", 'Daraja', 'Holat', 'Xotira %', 'Xato', 'Keyingi takror'];
          const rows = all.map((w) => [
            w.text,
            w.transcription ?? '',
            w.primaryTranslation ?? '',
            w.deckTitle ?? '',
            w.cefrLevel?.toUpperCase() ?? '',
            w.status,
            String(w.memoryPercent),
            String(w.lapses),
            w.nextReviewAt ?? '',
          ]);
          const csv = [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
          const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `sozchi-sozlarim-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err: unknown) => {
          this.exporting.set(false);
          this.toast.error(problemMessage(err));
        },
      });
  }

  protected speak(word: MyWordItem): void {
    if (word.audioUrl) {
      void new Audio(word.audioUrl).play().catch(() => undefined);
      return;
    }
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(word.text);
    u.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  protected reloadAll(): void {
    this.words.reload();
    this.counts.reload();
    this.shell.refreshStats();
  }

  /** Keyingi takror ustuni: bugun bo'lsa qizil "Bugun 18:00" tegi. */
  protected nextReview(w: MyWordItem): { text: string; urgent: boolean } {
    if (!w.nextReviewAt || w.status === 'new') return { text: '—', urgent: false };
    const date = new Date(w.nextReviewAt);
    const now = new Date();
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (date.getTime() <= now.getTime()) return { text: 'Hozir', urgent: true };
    if (days === 0) return { text: `Bugun ${time}`, urgent: true };
    if (days === 1) return { text: 'Ertaga', urgent: false };
    return { text: `${days} kun`, urgent: false };
  }

  protected sortLabel(): string {
    return SORTS.find((s) => s.id === this.sortBy())?.label ?? 'Saralash';
  }
}
