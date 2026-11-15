import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, concat, map, Observable, of, toArray } from 'rxjs';
import { apiUrl } from '../../../core/api/api-url';
import { PaginatedResponse } from '../../../core/api/paginated-response.model';
import { problemMessage } from '../../../core/api/problem-details';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/http-context';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatNumber } from '../../../shared/ui/layout/format';
import { Modal } from '../../../shared/ui/modal/modal';
import { Select, SelectOption } from '../../../shared/ui/select/select';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../../shared/ui/state/error-state';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  CEFR_OPTIONS,
  CONDITION_OPTIONS,
  CRUD_CONFIGS,
  CrudColumn,
  CrudField,
  OptionsSource,
  POS_OPTIONS,
} from './admin-crud.config';

type Row = Record<string, unknown> & { id: number };
type Option = { value: string | number; label: string };

/**
 * Admin CRUD sahifasi (So'zlar, To'plamlar, Kategoriyalar, Yutuqlar, Tillar).
 * Resurs route data'dagi `resource` orqali tanlanadi; API: GET/POST {endpoint}, GET/PUT/DELETE {endpoint}/{id}.
 */
@Component({
  selector: 'app-admin-crud',
  imports: [Button, Icon, Modal, Pagination, Select, Skeleton, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './admin-crud.html',
})
export class AdminCrud {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** Route data. */
  readonly resource = input.required<string>();
  /** ?new=1 — yaratish oynasini darhol ochish. */
  readonly new = input<string | undefined>(undefined);

  protected readonly config = computed(() => CRUD_CONFIGS[this.resource()]);
  protected readonly formatNumber = formatNumber;

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly form = signal<Record<string, unknown>>({});
  protected readonly saving = signal(false);
  protected readonly loadingItem = signal(false);
  protected readonly busyId = signal<number | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly list = rxResource({
    params: () => ({ endpoint: this.config().endpoint, search: this.search(), page: this.page(), pageSize: this.pageSize() }),
    stream: ({ params }) => {
      let p = new HttpParams().set('page', params.page).set('pageSize', params.pageSize);
      if (params.search.trim()) p = p.set('search', params.search.trim());
      return this.http.get<PaginatedResponse<Row>>(apiUrl(params.endpoint), { params: p, context: this.quiet });
    },
  });

  /** Forma variantlari (tillar, kategoriyalar) — kerak bo'lganda bir marta yuklanadi. */
  protected readonly languages = rxResource({
    stream: () => this.fetchAll('/admin/languages').pipe(map((l) => l.map((x) => ({ value: x.id, label: `${x['name']} (${x['code']})` })))),
  });
  protected readonly categories = rxResource({
    stream: () => this.fetchAll('/admin/categories').pipe(map((l) => l.map((x) => ({ value: x.id, label: String(x['name']) })))),
  });

  constructor() {
    effect(() => {
      if (this.new() && this.config()) untracked(() => this.openCreate());
    });
    effect(() => {
      this.resource();
      untracked(() => {
        this.search.set('');
        this.page.set(1);
      });
    });
  }

  private fetchAll(endpoint: string): Observable<Row[]> {
    return this.http
      .get<PaginatedResponse<Row>>(apiUrl(endpoint), { params: { page: 1, pageSize: 100 }, context: this.quiet })
      .pipe(
        map((r) => r.data),
        catchError(() => of([] as Row[])),
      );
  }

  protected options(source: OptionsSource | undefined): Option[] {
    switch (source) {
      case 'cefr':
        return CEFR_OPTIONS;
      case 'pos':
        return POS_OPTIONS;
      case 'conditions':
        return CONDITION_OPTIONS;
      case 'languages':
        return this.languages.hasValue() ? this.languages.value() : [];
      case 'parentCategories':
        return (this.categories.hasValue() ? this.categories.value() : []).filter((c) => c.value !== this.editingId());
      default:
        return [];
    }
  }

  /** Majburiy bo'lmagan maydonda bo'sh ("—") variant ham bor. */
  protected selectOptions(field: CrudField): SelectOption[] {
    const list = this.options(field.options);
    return field.required ? list : [{ value: '', label: '—' }, ...list];
  }

  protected selectValue(key: string): string | number {
    const v = this.form()[key];
    return typeof v === 'number' || typeof v === 'string' ? v : '';
  }

  protected setSelect(field: CrudField, value: string | number | null): void {
    this.form.update((f) => ({ ...f, [field.key]: value === '' ? null : value }));
  }

  protected visibleFields(): CrudField[] {
    return this.config().fields.filter((f) => !f.createOnly || this.editingId() === null);
  }

  protected cell(row: Row, col: CrudColumn): string {
    const v = row[col.key];
    if (v === null || v === undefined || v === '') return '—';
    if (col.type === 'tag' && typeof v === 'string') return v.length <= 3 ? v.toUpperCase() : v;
    if (col.type === 'number' && typeof v === 'number') return formatNumber(v);
    if (col.type === 'date' && typeof v === 'string') return new Date(v).toLocaleDateString('uz-UZ');
    return String(v);
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.search.set(value);
      this.page.set(1);
    }, 300);
  }

  protected openCreate(): void {
    this.editingId.set(null);
    const defaults = { ...this.config().defaults };
    if (this.config().fields.some((f) => f.key === 'languageId') && this.languages.hasValue() && this.languages.value()[0]) {
      defaults['languageId'] = this.languages.value()[0].value;
    }
    this.form.set(defaults);
    this.formOpen.set(true);
  }

  protected openEdit(row: Row): void {
    this.editingId.set(row.id);
    this.form.set({ ...this.config().defaults, ...row });
    this.formOpen.set(true);
    // Ro'yxatda hamma maydon bo'lmasligi mumkin — to'liq yozuvni olamiz.
    this.loadingItem.set(true);
    this.http.get<Row>(apiUrl(`${this.config().endpoint}/${row.id}`), { context: this.quiet }).subscribe({
      next: (full) => {
        this.loadingItem.set(false);
        if (this.editingId() === row.id) this.form.set({ ...this.config().defaults, ...row, ...full });
      },
      error: () => this.loadingItem.set(false),
    });
  }

  protected str(key: string): string {
    const v = this.form()[key];
    return v === null || v === undefined ? '' : String(v);
  }

  protected value(key: string): unknown {
    return this.form()[key];
  }

  protected setValue(field: CrudField, event: Event): void {
    const el = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    let v: unknown = el.value;
    if (field.type === 'checkbox') v = (el as HTMLInputElement).checked;
    else if (field.type === 'number') v = el.value === '' ? null : Number(el.value);
    else if (field.type === 'select') {
      v = el.value === '' ? null : field.options === 'languages' || field.options === 'parentCategories' ? Number(el.value) : el.value;
    } else if (v === '') v = null;
    this.form.update((f) => ({ ...f, [field.key]: v }));
  }

  protected toggleCategory(id: number | string): void {
    const current = (this.form()['categoryIds'] as number[] | undefined) ?? [];
    const next = current.includes(Number(id)) ? current.filter((x) => x !== Number(id)) : [...current, Number(id)];
    this.form.update((f) => ({ ...f, categoryIds: next }));
  }

  protected hasCategory(id: number | string): boolean {
    return ((this.form()['categoryIds'] as number[] | undefined) ?? []).includes(Number(id));
  }

  protected save(): void {
    const cfg = this.config();
    const missing = this.visibleFields().find((f) => f.required && (this.form()[f.key] === null || this.form()[f.key] === undefined || this.form()[f.key] === ''));
    if (missing) {
      this.toast.error(`«${missing.label}» maydonini to'ldiring`);
      return;
    }
    const id = this.editingId();
    const body = { ...this.form(), ...(id !== null ? { id } : {}) };
    this.saving.set(true);
    const request = id === null ? this.http.post<Row>(apiUrl(cfg.endpoint), body) : this.http.put<Row>(apiUrl(`${cfg.endpoint}/${id}`), body);
    request.subscribe({
      next: (saved) => {
        // So'z yaratilganda birinchi tarjima va misolni ham qo'shamiz.
        const extras = id === null && this.resource() === 'words' ? this.wordExtras(saved.id) : of(null);
        extras.subscribe({
          next: () => this.done(id === null ? `Yangi ${cfg.singular} qo'shildi` : "O'zgarishlar saqlandi"),
          error: (err: unknown) => {
            this.done(`${cfg.singular} qo'shildi, lekin tarjima/misol saqlanmadi`);
            this.toast.error(problemMessage(err));
          },
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(problemMessage(err));
      },
    });
  }

  private wordExtras(wordId: number): Observable<unknown> {
    const f = this.form();
    const uz = this.languages.hasValue() ? this.languages.value().find((l) => l.label.includes('(uz)'))?.value : undefined;
    const calls: Observable<unknown>[] = [];
    if (f['translation'] && uz) {
      calls.push(
        this.http.post(apiUrl(`/admin/words/${wordId}/translations`), { wordId, languageId: uz, translation: f['translation'], isPrimary: true }),
      );
    }
    if (f['example']) {
      calls.push(
        this.http.post(apiUrl(`/admin/words/${wordId}/examples`), {
          wordId,
          sentence: f['example'],
          translationLanguageId: f['exampleTranslation'] && uz ? uz : null,
          translation: f['exampleTranslation'] ?? null,
        }),
      );
    }
    return calls.length ? concat(...calls).pipe(toArray()) : of(null);
  }

  private done(message: string): void {
    this.saving.set(false);
    this.formOpen.set(false);
    this.toast.success(message);
    this.list.reload();
    if (this.resource() === 'categories') this.categories.reload();
    if (this.resource() === 'languages') this.languages.reload();
    if (this.new()) void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected async remove(row: Row): Promise<void> {
    const name = String(row['text'] ?? row['title'] ?? row['name'] ?? row.id);
    const ok = await this.confirm.ask({
      title: `${this.config().singular[0].toUpperCase()}${this.config().singular.slice(1)}ni o'chirish`,
      subject: `«${name}»`,
      message: "ni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.",
      confirmText: "Ha, o'chirish",
    });
    if (!ok) return;
    this.busyId.set(row.id);
    this.http.delete(apiUrl(`${this.config().endpoint}/${row.id}`)).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`«${name}» o'chirildi`);
        this.list.reload();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toast.error(problemMessage(err));
      },
    });
  }
}
