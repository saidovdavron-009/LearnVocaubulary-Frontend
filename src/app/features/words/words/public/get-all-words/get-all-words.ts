import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of, skip, switchMap } from 'rxjs';
import { CefrLevel, PartOfSpeech } from '../../../../../core/api/enums';
import { problemMessage } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { AudioButton } from '../../../../../shared/ui/audio-button/audio-button';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { Select, SelectOption } from '../../../../../shared/ui/select/select';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tab } from '../../../../../shared/ui/tab/tab';
import { Table } from '../../../../../shared/ui/table/table';
import { Tag, TagColor } from '../../../../../shared/ui/tag/tag';
import { AddMyWord } from '../../../../study/my-words/public/add-my-word/add-my-word';
import { WordListItem, WordOfTheDay } from './get-all-words.models';
import { GetAllWordsService } from './get-all-words.service';

const PAGE_SIZE = 12;

const CEFR_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Barcha darajalar' },
  ...(['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as CefrLevel[]).map((l) => ({ value: l, label: l.toUpperCase() })),
];

/** So'z turkumlari (backend PartOfSpeech) va o'zbekcha nomlari. */
const POS_LABELS: Record<PartOfSpeech, string> = {
  noun: 'Ot (noun)',
  verb: "Fe'l (verb)",
  adjective: 'Sifat (adjective)',
  adverb: 'Ravish (adverb)',
  pronoun: 'Olmosh (pronoun)',
  preposition: "Ko'makchi (preposition)",
  conjunction: "Bog'lovchi (conjunction)",
  interjection: 'Undov (interjection)',
  phrase: 'Ibora (phrase)',
  idiom: 'Idioma',
};
/** Figma'dagi tezkor chiplar. */
const POS_CHIPS: (PartOfSpeech | null)[] = [null, 'noun', 'verb', 'adjective', 'phrase', 'idiom'];

const POS_COLORS: Partial<Record<PartOfSpeech, TagColor>> = {
  noun: 'mint',
  verb: 'violet',
  adjective: 'blue',
  adverb: 'yellow',
  interjection: 'coral',
  phrase: 'yellow',
  idiom: 'violet',
};

/** Figma: 06 Lug'at — kunning so'zi, qidiruv va filtrlar, so'z kartochkalari, "Ko'proq yuklash". */
@Component({
  selector: 'app-get-all-words',
  imports: [RouterLink, AudioButton, Button, Icon, Select, Skeleton, EmptyState, ErrorState, Tab, Table, Tag, AddMyWord],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './get-all-words.html',
})
export class GetAllWords implements OnInit {
  private readonly service = inject(GetAllWordsService);
  private readonly shell = inject(AppShellService);
  private readonly router = inject(Router);

  /** URL query parametrlari (topbar qidiruvi, landing mavzulari shu orqali keladi). */
  readonly search = input<string | undefined>();
  readonly categoryId = input<string | undefined>();

  protected readonly cefrOptions = CEFR_OPTIONS;
  protected readonly posChips = POS_CHIPS;
  protected readonly posLabels = POS_LABELS;
  protected readonly posOptions: SelectOption<string>[] = [
    { value: '', label: "So'z turkumi" },
    ...(Object.keys(POS_LABELS) as PartOfSpeech[]).map((p) => ({ value: p, label: POS_LABELS[p] })),
  ];
  protected readonly formatNumber = formatNumber;

  // Filtrlar
  protected readonly query = signal('');
  protected readonly cefr = signal<CefrLevel | null>(null);
  protected readonly pos = signal<PartOfSpeech | null>(null);
  protected readonly category = signal<number | null>(null);
  protected readonly languageId = signal<number | null>(null);
  protected readonly view = signal<'grid' | 'list'>('grid');

  // Ma'lumot
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<WordListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly hasNext = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly wordOfTheDay = signal<WordOfTheDay | null | undefined>(undefined);
  protected readonly categoryOptions = signal<SelectOption<string>[]>([{ value: '', label: 'Mavzu' }]);
  private readonly ready = signal(false);

  private readonly filters = computed(() => ({
    search: this.query().trim(),
    cefrLevel: this.cefr(),
    partOfSpeech: this.pos(),
    categoryId: this.category(),
    languageId: this.languageId(),
    ready: this.ready(),
  }));

  protected readonly hasFilters = computed(
    () => !!this.query().trim() || !!this.cefr() || !!this.pos() || this.category() !== null,
  );

  constructor() {
    // URL'dan kelgan qidiruv / mavzu (topbar qidiruvi bir sahifada qayta ishlatilsa ham yangilanadi).
    effect(() => {
      const search = this.search() ?? '';
      const cat = this.categoryId();
      untracked(() => {
        this.query.set(search);
        this.category.set(cat ? Number(cat) : null);
      });
    });

    toObservable(this.filters)
      .pipe(
        skip(1),
        debounceTime(250),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap((f) => {
          if (!f.ready) return of(null);
          this.state.set('loading');
          this.syncUrl();
          return this.service.getAll({ ...f, onlyMine: false, page: 1, pageSize: PAGE_SIZE }).pipe(
            catchError((err: unknown) => {
              this.error.set(problemMessage(err));
              this.state.set('error');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        if (!res) return;
        this.items.set(res.data);
        this.total.set(res.totalCount);
        this.page.set(res.page);
        this.hasNext.set(res.hasNext);
        this.state.set('ready');
      });

    effect(() => {
      const total = this.total();
      const subtitle = this.subtitle();
      untracked(() => this.shell.setPageHeader("Lug'at", `${formatNumber(total)} ta so'z${subtitle}`));
    });
  }

  /** "· English → O'zbekcha" */
  private readonly languagePair = signal('');
  private readonly subtitle = computed(() => this.languagePair());

  ngOnInit(): void {
    forkJoin({
      settings: this.service.settings(),
      languages: this.service.languages(),
      categories: this.service.categories(),
    }).subscribe(({ settings, languages, categories }) => {
      this.categoryOptions.set([{ value: '', label: 'Mavzu' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]);
      const learning = languages.find((l) => l.id === settings?.learningLanguageId);
      const native = languages.find((l) => l.code === this.shell.profile()?.nativeLanguageCode);
      if (learning && native) this.languagePair.set(` · ${learning.name} → ${native.nativeName || native.name}`);
      this.languageId.set(settings?.learningLanguageId ?? null);
      this.service.wordOfTheDay(settings?.learningLanguageId ?? null).subscribe((w) => this.wordOfTheDay.set(w));
      this.ready.set(true);
    });
  }

  protected reload(): void {
    this.ready.set(false);
    queueMicrotask(() => this.ready.set(true));
  }

  protected loadMore(): void {
    if (this.loadingMore() || !this.hasNext()) return;
    this.loadingMore.set(true);
    const f = this.filters();
    this.service
      .getAll({ ...f, onlyMine: false, page: this.page() + 1, pageSize: PAGE_SIZE })
      .subscribe({
        next: (res) => {
          this.items.update((list) => [...list, ...res.data]);
          this.page.set(res.page);
          this.hasNext.set(res.hasNext);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onCefr(value: string | number | null): void {
    this.cefr.set(value ? (value as CefrLevel) : null);
  }

  protected onPos(value: string | number | null): void {
    this.pos.set(value ? (value as PartOfSpeech) : null);
  }

  protected onCategory(value: string | number | null): void {
    this.category.set(value ? Number(value) : null);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.cefr.set(null);
    this.pos.set(null);
    this.category.set(null);
  }

  protected posColor(pos: PartOfSpeech | null): TagColor {
    return (pos && POS_COLORS[pos]) || 'gray';
  }

  /** Qidiruv va mavzu URL'da saqlanadi (sahifani yangilaganda yoki ulashganda qoladi). */
  private syncUrl(): void {
    const search = this.query().trim() || null;
    const categoryId = this.category();
    void this.router.navigate([], {
      queryParams: { search, categoryId },
      replaceUrl: true,
    });
  }
}
