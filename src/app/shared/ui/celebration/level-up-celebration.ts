import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { cefrInfo, LevelUp } from '../../../core/api/cefr';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

const COLORS = ['#5b2eff', '#ffc83d', '#22c493', '#ff8a6b', '#7ea6ff', '#ff5a3c'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  shape: 'rect' | 'circle';
  life: number;
}

/**
 * Darajadan o'tish tabrigi: to'liq ekran oyna, konfetti (canvas, kutubxonasiz) va
 * "A2 → B1" nishoni. <app-level-up-celebration [levelUp]="x" (closed)="..." />
 */
@Component({
  selector: 'app-level-up-celebration',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', '(document:keydown.escape)': 'close()' },
  styles: `
    .pop {
      animation: pop 520ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
    }
    .rise {
      animation: rise 480ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    .glow {
      animation: glow 2.4s ease-in-out infinite;
    }
    @keyframes pop {
      from { transform: scale(0.4) rotate(-8deg); opacity: 0; }
      to { transform: scale(1) rotate(0); opacity: 1; }
    }
    @keyframes rise {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes glow {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    @media (prefers-reduced-motion: reduce) {
      .pop, .rise, .glow { animation: none; }
    }
  `,
  template: `
    <div
      class="fixed inset-0 z-100 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      aria-describedby="level-up-text"
    >
      <canvas #canvas class="pointer-events-none fixed inset-0 size-full" aria-hidden="true"></canvas>

      <div class="pop relative flex w-full max-w-md flex-col items-center overflow-hidden rounded-[32px] border-2 border-line bg-surface px-6 pt-10 pb-7 text-center shadow-card md:px-9">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-yellow-soft to-transparent" aria-hidden="true"></div>

        <div class="glow relative flex size-24 items-center justify-center rounded-full bg-yellow text-fg shadow-hard shadow-yellow-deep">
          <app-icon name="trophy" [size]="48" />
        </div>

        <p class="rise relative mt-6 text-label-caps text-violet-text uppercase" style="animation-delay: 120ms">
          {{ finishedAll() ? 'Barcha darajalar yakunlandi' : 'Yangi daraja ochildi' }}
        </p>
        <h2 id="level-up-title" class="rise relative mt-2 font-display text-h1 text-fg" style="animation-delay: 180ms">
          Tabriklaymiz! 🎉
        </h2>

        <!-- A2 → B1 -->
        <div class="rise relative mt-6 flex items-center gap-4" style="animation-delay: 260ms" aria-hidden="true">
          <span class="flex flex-col items-center gap-1">
            <span class="flex size-16 items-center justify-center rounded-2xl bg-mint text-fg-inverse font-display text-h2 shadow-hard-sm shadow-mint-deep">
              {{ from()?.code }}
            </span>
            <span class="flex items-center gap-1 text-caption text-mint-text"><app-icon name="check" [size]="12" /> Tugatildi</span>
          </span>
          @if (to(); as next) {
            <app-icon name="arrow-right" [size]="28" class="mb-5 text-fg-muted" />
            <span class="flex flex-col items-center gap-1">
              <span class="flex size-16 items-center justify-center rounded-2xl bg-violet text-fg-inverse font-display text-h2 shadow-hard-sm shadow-violet-deep">
                {{ next.code }}
              </span>
              <span class="text-caption text-violet-text">{{ next.title }}</span>
            </span>
          }
        </div>

        <p id="level-up-text" class="rise relative mt-6 text-body-lg text-fg-secondary" style="animation-delay: 340ms">
          @if (to(); as next) {
            Siz <strong class="text-fg">{{ from()?.code }}</strong> darajasini muvaffaqiyatli tugatib,
            <strong class="text-violet-text">{{ next.code }} — {{ next.title }}</strong> darajasiga o'tdingiz!
            Endi sizga {{ next.code }} darajasidagi yangi so'zlar beriladi.
          } @else {
            Siz <strong class="text-fg">C2</strong> darajasini ham tugatdingiz — bu eng yuqori cho'qqi!
            Ingliz tili lug'atingiz endi mukammal darajada.
          }
        </p>

        @if (levelUp().wordsLearned > 0) {
          <div class="rise relative mt-5 flex items-center gap-2 rounded-xl bg-violet-soft px-4 py-2.5 text-body-strong text-violet-text" style="animation-delay: 400ms">
            <app-icon name="book" [size]="18" /> {{ levelUp().wordsLearned }} ta so'z yodlandi
          </div>
        }

        <p class="rise relative mt-4 text-body text-fg-muted" style="animation-delay: 440ms">
          {{ to() ? "Bu katta yutuq — shu ruhda davom eting! 💪" : 'Siz haqiqiy chempionsiz! 🏆' }}
        </p>

        <button
          appButton
          type="button"
          size="l"
          icon="arrow-right"
          class="rise relative mt-7 w-full"
          style="animation-delay: 500ms"
          (click)="close()"
          #continueBtn
        >
          {{ to() ? "Davom etish" : 'Ajoyib!' }}
        </button>
      </div>
    </div>
  `,
})
export class LevelUpCelebration {
  private readonly destroyRef = inject(DestroyRef);

  readonly levelUp = input.required<LevelUp>();
  readonly closed = output<void>();

  protected readonly from = computed(() => cefrInfo(this.levelUp().from));
  protected readonly to = computed(() => cefrInfo(this.levelUp().to));
  protected readonly finishedAll = computed(() => this.levelUp().to === null);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  // appButton — komponent, shuning uchun DOM elementini aniq so'raymiz.
  private readonly continueBtn = viewChild('continueBtn', { read: ElementRef<HTMLElement> });
  private frame = 0;
  private bursts: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    afterNextRender(() => {
      this.continueBtn()?.nativeElement.focus();
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      this.startConfetti();
    });
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.frame);
      this.bursts.forEach(clearTimeout);
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  private startConfetti(): void {
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: Particle[] = [];
    const burst = (x: number, y: number, count: number, angle: number, spread: number) => {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread;
        const speed = 7 + Math.random() * 9;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          size: 6 + Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.3,
          shape: Math.random() < 0.7 ? 'rect' : 'circle',
          life: 1,
        });
      }
    };

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;
    // Ikki chetdan "xlopushka" otilishi, keyin markazdan yana ikki marta.
    burst(0, h() * 0.75, 90, -Math.PI / 3, 0.9);
    burst(w(), h() * 0.75, 90, (-2 * Math.PI) / 3, 0.9);
    this.bursts.push(setTimeout(() => burst(w() / 2, h() * 0.35, 120, -Math.PI / 2, Math.PI * 2), 450));
    this.bursts.push(setTimeout(() => {
      burst(w() * 0.2, h(), 70, -Math.PI / 2.4, 0.7);
      burst(w() * 0.8, h(), 70, -Math.PI / 1.7, 0.7);
    }, 1100));

    const tick = () => {
      ctx.clearRect(0, 0, w(), h());
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        if (p.vy > 0) p.life -= 0.006;
        if (p.life <= 0 || p.y > h() + 40) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}
