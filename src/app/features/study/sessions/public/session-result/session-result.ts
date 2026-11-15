import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { apiUrl } from '../../../../../core/api/api-url';
import { AuthService } from '../../../../../core/auth/auth.service';
import { SKIP_ERROR_TOAST } from '../../../../../core/interceptors/http-context';
import { ShellProfile, ShellStats } from '../../../../../core/layout/app-shell.models';
import { Button } from '../../../../../shared/ui/button/button';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { formatNumber } from '../../../../../shared/ui/layout/format';
import { ErrorState } from '../../../../../shared/ui/state/error-state';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { StudyResultState } from '../study-session/study-session.models';

/** Swagger: GET /api/study/sessions/{id} → GetOneSessionResponse (kerakli maydonlar). */
interface SessionSummary {
  id: number;
  isFinished: boolean;
  durationSeconds: number;
  wordsStudied: number;
  correctCount: number;
  wrongCount: number;
  accuracyPercent: number;
  xpEarned: number;
}

/** Figma 12 dagi konfetti: chap %, tepa px, burilish, rang. */
const CONFETTI = [
  { x: 20.8, y: 194, r: 20, c: 'bg-yellow' },
  { x: 28.2, y: 140, r: 30, c: 'bg-mint' },
  { x: 69.4, y: 205, r: -15, c: 'bg-coral' },
  { x: 76.4, y: 319, r: -40, c: 'bg-yellow' },
  { x: 17.4, y: 560, r: 20, c: 'bg-coral' },
  { x: 80.6, y: 553, r: -25, c: 'bg-mint' },
  { x: 38.9, y: 87, r: -10, c: 'bg-blue' },
  { x: 60.6, y: 110, r: 15, c: 'bg-yellow' },
];

/** Figma: 12 Sessiya natijasi. GET /study/sessions/{id} + GET /stats/me + GET /profile/me. */
@Component({
  selector: 'app-session-result',
  imports: [RouterLink, Button, Icon, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-violet px-4 py-12' },
  templateUrl: './session-result.html',
})
export class SessionResult {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly quiet = new HttpContext().set(SKIP_ERROR_TOAST, true);

  /** Route parametri. */
  readonly id = input.required<string>();

  protected readonly confetti = CONFETTI;
  protected readonly formatNumber = formatNumber;
  /** Mashq sahifasidan router state orqali keladi (sahifa yangilansa bo'sh bo'ladi). */
  private readonly state = (inject(Router).currentNavigation()?.extras.state ?? history.state) as Partial<StudyResultState>;
  protected readonly achievements = this.state.achievements ?? [];

  protected readonly data = rxResource({
    params: () => ({ id: this.id() }),
    stream: ({ params }) =>
      forkJoin({
        session: this.http.get<SessionSummary>(apiUrl(`/study/sessions/${params.id}`), { context: this.quiet }),
        stats: this.http.get<ShellStats>(apiUrl('/stats/me'), { context: this.quiet }),
        profile: this.http.get<ShellProfile>(apiUrl('/profile/me'), { context: this.quiet }),
      }),
  });

  private readonly value = computed(() => (this.data.hasValue() ? this.data.value() : null));

  protected readonly name = computed(() => {
    const p = this.value()?.profile;
    return (p?.displayName || p?.username || this.auth.username() || '').split(' ')[0];
  });

  protected readonly levelUp = computed(() => {
    const s = this.value()?.stats;
    return !!s && this.state.levelBefore !== undefined && s.level > this.state.levelBefore;
  });

  /** Daraja paneli: joriy daraja ichidagi progress (0–100). */
  protected readonly levelPercent = computed(() => {
    const s = this.value()?.stats;
    if (!s) return 0;
    const span = s.nextLevelXp - s.levelStartXp;
    return span > 0 ? Math.min(100, Math.round(((s.xp - s.levelStartXp) / span) * 100)) : 100;
  });

  protected readonly subtitle = computed(() => {
    const v = this.value();
    if (!v) return '';
    if (v.stats.today.goalReached) return "Bugungi mashg'ulot yakunlandi — kunlik maqsadga erishdingiz.";
    const left = Math.max(0, v.stats.today.dailyGoal - v.stats.today.newWords);
    return `Mashg'ulot yakunlandi — kunlik maqsadgacha yana ${left} ta so'z.`;
  });

  protected async share(): Promise<void> {
    const v = this.value();
    if (!v) return;
    const text = `So'zchi'da ${v.session.wordsStudied} ta so'z takrorladim, aniqlik ${v.session.accuracyPercent}%, +${v.session.xpEarned} XP! 🔥 ${v.stats.currentStreak} kunlik seriya.`;
    const url = location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "So'zchi", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      this.toast.success('Natija nusxalandi — do\'stlaringizga yuboring!');
    } catch {
      // Foydalanuvchi ulashishni bekor qildi.
    }
  }
}
