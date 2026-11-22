import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { handleFormError } from '../../../../../core/api/problem-details';
import { AppShellService } from '../../../../../core/layout/app-shell.service';
import { ShellProfile } from '../../../../../core/layout/app-shell.models';
import { Alert } from '../../../../../shared/ui/alert/alert';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { Input } from '../../../../../shared/ui/input/input';
import { formatMemberSince } from '../../../../../shared/ui/layout/format';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ui/select/select';
import { Skeleton } from '../../../../../shared/ui/skeleton/skeleton';
import { Tag } from '../../../../../shared/ui/tag/tag';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { UpdateMyProfileService } from './update-my-profile.service';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,50}$/;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function timezoneOptions(): SelectOption<string>[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Asia/Tashkent'];
  return zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }));
}

/** Figma: 17 — "Profil" kartasi, hamda "Til va mintaqa" (vaqt zonasi). Ikkalasi PUT /api/profile/me. */
@Component({
  selector: 'app-update-my-profile',
  imports: [ReactiveFormsModule, RouterLink, Alert, Avatar, Button, Icon, Input, Modal, Select, Skeleton, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './update-my-profile.html',
})
export class UpdateMyProfile {
  private readonly service = inject(UpdateMyProfileService);
  private readonly shell = inject(AppShellService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly profile = this.shell.profile;
  protected readonly level = computed(() => this.shell.stats()?.level ?? null);
  protected readonly memberSince = computed(() => {
    const p = this.profile();
    return p ? formatMemberSince(p.createdAt) : '';
  });
  protected readonly languageOptions = signal<SelectOption<number>[]>([]);
  protected readonly timezones = timezoneOptions();

  protected readonly form = this.fb.group({
    displayName: ['', [Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    email: [{ value: '', disabled: true }],
    nativeLanguageId: this.fb.control<number | null>(null),
    timezone: ['Asia/Tashkent', [Validators.required, Validators.maxLength(50)]],
  });
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly avatarOpen = signal(false);
  protected readonly avatarForm = this.fb.group({
    avatarUrl: ['', [Validators.maxLength(2000), Validators.pattern(/^https:\/\/.+/)]],
  });
  protected readonly avatarError = signal<string | null>(null);
  protected readonly uploading = signal(false);

  constructor() {
    this.service.languages().subscribe((langs) =>
      this.languageOptions.set(langs.map((l) => ({ value: l.id, label: l.nativeName || l.name }))),
    );
    // Profil yuklanganda (yoki saqlangandan keyin yangilanganda) formani to'ldiramiz.
    effect(() => {
      const p = this.profile();
      if (p && !this.form.dirty) this.fill(p);
    });
  }

  protected reset(): void {
    const p = this.profile();
    if (p) this.fill(p);
    this.error.set(null);
  }

  protected submit(): void {
    this.error.set(null);
    const p = this.profile();
    if (!p) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.save(
      {
        username: v.username.trim(),
        displayName: v.displayName.trim() || null,
        avatarUrl: p.avatarUrl,
        nativeLanguageId: v.nativeLanguageId,
        timezone: v.timezone,
      },
      () => this.error.set(null),
      (message) => this.error.set(message),
    );
  }

  protected openAvatar(): void {
    // Yuklangan rasm manzili ("/api/uploads/...") URL maydonida ko'rsatilmaydi.
    const current = this.profile()?.avatarUrl ?? '';
    this.avatarForm.reset({ avatarUrl: current.startsWith('https://') ? current : '' });
    this.avatarError.set(null);
    this.avatarOpen.set(true);
  }

  protected saveAvatar(remove = false): void {
    const p = this.profile();
    if (!p) return;
    if (!remove && this.avatarForm.invalid) {
      this.avatarForm.markAllAsTouched();
      return;
    }
    const url = remove ? null : this.avatarForm.getRawValue().avatarUrl.trim() || null;
    this.save(
      {
        username: p.username,
        displayName: p.displayName,
        avatarUrl: url,
        nativeLanguageId: p.nativeLanguageId,
        timezone: p.timezone || 'Asia/Tashkent',
      },
      () => this.avatarOpen.set(false),
      (message) => this.avatarError.set(message),
      this.avatarForm,
    );
  }

  /** Kompyuterdan tanlangan rasm: yuklanadi va darhol avatar qilib saqlanadi. */
  protected onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = ''; // shu faylni qayta tanlash ham ishlasin
    if (!file) return;

    this.avatarError.set(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      this.avatarError.set('Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.avatarError.set('Rasm hajmi 2 MB dan oshmasligi kerak.');
      return;
    }

    const p = this.profile();
    if (!p) return;
    this.uploading.set(true);
    this.service.uploadImage(file).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.save(
          {
            username: p.username,
            displayName: p.displayName,
            avatarUrl: res.url,
            nativeLanguageId: p.nativeLanguageId,
            timezone: p.timezone || 'Asia/Tashkent',
          },
          () => this.avatarOpen.set(false),
          (message) => this.avatarError.set(message),
          this.avatarForm,
        );
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.avatarError.set(handleFormError(this.avatarForm, err) ?? "Rasmni yuklab bo'lmadi.");
      },
    });
  }

  private save(
    body: Parameters<UpdateMyProfileService['update']>[0],
    done: () => void,
    fail: (message: string | null) => void,
    form: FormGroup = this.form,
  ): void {
    this.saving.set(true);
    this.service.update(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.markAsPristine();
        this.shell.refreshProfile();
        this.toast.success('Profil saqlandi');
        done();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        fail(handleFormError(form, err));
      },
    });
  }

  private fill(p: ShellProfile): void {
    this.form.reset({
      displayName: p.displayName ?? '',
      username: p.username,
      email: p.email,
      nativeLanguageId: p.nativeLanguageId,
      timezone: p.timezone || 'Asia/Tashkent',
    });
  }
}
