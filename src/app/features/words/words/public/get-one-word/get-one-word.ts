import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { WordStatus } from '../../../../../core/api/enums';
import { getProblemDetails } from '../../../../../core/api/problem-details';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { AudioButton } from '../../../../../shared/ui/audio-button/audio-button';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNextReview, formatNumber } from '../../../../../shared/ui/layout/format';
import { Menu } from '../../../../../shared/ui/menu/menu';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../../shared/ui/state/empty-state';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { Tag, TagColor } from '../../../../../shared/ui/tag/tag';
import { AddMyWord } from '../../../../study/my-words/public/add-my-word/add-my-word';
import { RemoveMyWord } from '../../../../study/my-words/public/remove-my-word/remove-my-word';
import { ResetMyWord } from '../../../../study/my-words/public/reset-my-word/reset-my-word';
import { ToggleFavorite } from '../../../../study/my-words/public/toggle-favorite/toggle-favorite';
import { CreateMnemonic } from '../../../mnemonics/public/create-mnemonic/create-mnemonic';
import { DeleteMyMnemonic } from '../../../mnemonics/public/delete-my-mnemonic/delete-my-mnemonic';
import { UpvoteMnemonic } from '../../../mnemonics/public/upvote-mnemonic/upvote-mnemonic';
import { CreateReport } from '../../../reports/public/create-report/create-report';
import { WordMnemonic } from './get-one-word.models';
import { GetOneWordService } from './get-one-word.service';

const STATUS_LABELS: Record<WordStatus, string> = {
  new: 'Yangi',
  learning: "O'rganilmoqda",
  review: 'Takrorlash',
  mastered: "O'zlashtirildi",
};
const CATEGORY_COLORS: TagColor[] = ['violet', 'coral', 'yellow', 'mint', 'blue'];

/** Gapdagi so'zni ajratib ko'rsatish uchun bo'laklarga bo'lish. */
function highlight(sentence: string, word: string): { text: string; match: boolean }[] {
  if (!word) return [{ text: sentence, match: false }];
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence
    .split(new RegExp(`(${escaped})`, 'gi'))
    .filter(Boolean)
    .map((part) => ({ text: part, match: part.toLowerCase() === word.toLowerCase() }));
}

/** Figma: 07 So'z sahifasi. */
@Component({
  selector: 'app-get-one-word',
  imports: [
    RouterLink,
    AudioButton,
    Avatar,
    Button,
    Icon,
    Menu,
    Skeleton,
    EmptyState,
    ErrorState,
    Tag,
    AddMyWord,
    RemoveMyWord,
    ResetMyWord,
    ToggleFavorite,
    CreateMnemonic,
    DeleteMyMnemonic,
    UpvoteMnemonic,
    CreateReport,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-5' },
  templateUrl: './get-one-word.html',
})
export class GetOneWord {
  private readonly service = inject(GetOneWordService);
  private readonly shell = inject(AppShellService);
  private readonly auth = inject(AuthService);

  /** Route parametri: /words/:id */
  readonly id = input.required<string>();
  private readonly wordId = computed(() => Number(this.id()));

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly categoryColors = CATEGORY_COLORS;
  protected readonly formatNextReview = formatNextReview;
  protected readonly formatNumber = formatNumber;
  protected readonly highlight = highlight;
  protected readonly myUsername = computed(() => this.shell.profile()?.username ?? this.auth.username());

  protected readonly word = rxResource({
    params: () => ({ id: this.wordId() }),
    stream: ({ params }) => this.service.word(params.id),
  });
  protected readonly wordValue = computed(() => (this.word.hasValue() ? this.word.value() : null));
  protected readonly notFound = computed(() => getProblemDetails(this.word.error())?.status === 404);

  protected readonly progress = rxResource({
    params: () => {
      const w = this.wordValue();
      return w && this.auth.isAuthenticated() ? { id: w.id, text: w.text } : undefined;
    },
    stream: ({ params }) => this.service.myProgress(params.id, params.text),
  });
  protected readonly progressValue = computed(() => (this.progress.hasValue() ? this.progress.value() : null));

  protected readonly related = rxResource({
    params: () => {
      const w = this.wordValue();
      return w && w.categories.length ? { cat: w.categories[0].id, id: w.id } : undefined;
    },
    stream: ({ params }) => (params ? this.service.related(params.cat, params.id) : of([])),
  });

  /** Yangi qo'shilgan / o'chirilgan usullar (sahifani qayta yuklamasdan). */
  protected readonly addedMnemonics = signal<WordMnemonic[]>([]);
  protected readonly deletedMnemonics = signal<Set<number>>(new Set());
  protected readonly mnemonics = computed(() => {
    const base = this.wordValue()?.mnemonics ?? [];
    return [...this.addedMnemonics(), ...base]
      .filter((m) => !this.deletedMnemonics().has(m.id))
      .sort((a, b) => b.upvotes - a.upvotes);
  });

  protected readonly translations = computed(() =>
    [...(this.wordValue()?.translations ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
  );

  constructor() {
    effect(() => {
      const w = this.wordValue();
      untracked(() => this.shell.setPageHeader(w ? `Lug'at › ${w.text}` : "Lug'at", "So'z tafsilotlari"));
    });
  }

  protected onMnemonicCreated(m: { id: number; text: string; imageUrl: string | null; upvotes: number; createdAt: string }): void {
    this.addedMnemonics.update((list) => [
      { ...m, authorUsername: this.myUsername(), votedByMe: false },
      ...list,
    ]);
  }

  protected onMnemonicDeleted(id: number): void {
    this.deletedMnemonics.update((s) => new Set(s).add(id));
  }

  protected isMine(m: WordMnemonic): boolean {
    return !!m.authorUsername && m.authorUsername === this.myUsername();
  }
}
