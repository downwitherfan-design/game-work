/**
 * Confetti — سیستم ذره‌ی canvas سبک (بدون کتابخانه، ≤3KB).
 * رنگ‌ها از توکن‌های تم خوانده می‌شوند (بدون hex هاردکد در منطق).
 * با prefers-reduced-motion هیچ ذره‌ای رندر نمی‌شود (fallback بدون حرکت).
 */
import { Component } from 'preact';
import type { JSX } from 'preact';

export type ConfettiVariant = 'default' | 'gold';

export interface ConfettiProps {
  /** فعال‌سازی انفجار ذره‌ها */
  active: boolean;
  /** تعداد ذره (پیش‌فرض 120) */
  count?: number;
  /** مدت به میلی‌ثانیه (پیش‌فرض 2500) */
  durationMs?: number;
  variant?: ConfettiVariant;
  /** پس از پایان انیمیشن صدا زده می‌شود */
  onDone?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  w: number;
  h: number;
  color: string;
  shape: 0 | 1; // مستطیل | دایره
}

const TOKEN_VARS: Record<ConfettiVariant, string[]> = {
  default: ['--dor-correct', '--dor-present', '--dor-accent', '--dor-gold'],
  gold: ['--dor-gold', '--dor-present', '--dor-accent'],
};

function readTokenColors(el: Element, variant: ConfettiVariant): string[] {
  const cs = getComputedStyle(el);
  return TOKEN_VARS[variant]
    .map((v) => cs.getPropertyValue(v).trim())
    .filter((c) => c.length > 0);
}

export class Confetti extends Component<ConfettiProps> {
  private canvas: HTMLCanvasElement | null = null;
  private raf = 0;
  private running = false;

  override componentDidMount(): void {
    if (this.props.active) this.start();
  }

  override componentDidUpdate(prev: ConfettiProps): void {
    if (this.props.active && !prev.active) this.start();
  }

  override componentWillUnmount(): void {
    this.stop();
  }

  private stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private start(): void {
    const canvas = this.canvas;
    if (!canvas || this.running) return;
    if (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.props.onDone?.();
      return; // fallback بدون حرکت
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const colors = readTokenColors(canvas, this.props.variant ?? 'default');
    const count = this.props.count ?? 120;
    const duration = this.props.durationMs ?? 2500;

    const parts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      parts.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.3,
        y: h * 0.35,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 11 - 3,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: colors[i % colors.length] ?? '#888888',
        shape: Math.random() < 0.3 ? 1 : 0,
      });
    }

    const g = 0.25; // گرانش
    const start = performance.now();
    this.running = true;

    const frame = (now: number): void => {
      if (!this.running) return;
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      const fade = elapsed > duration - 500 ? Math.max(0, (duration - elapsed) / 500) : 1;
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.vy += g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (elapsed < duration) {
        this.raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        this.running = false;
        this.props.onDone?.();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  override render(): JSX.Element {
    return (
      <canvas
        class="dor-confetti"
        ref={(el) => {
          this.canvas = el;
        }}
        aria-hidden="true"
        data-dor="confetti"
      />
    );
  }
}
