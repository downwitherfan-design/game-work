/** تست کامل چرخه‌ی حیات Confetti — canvas و rAF شبیه‌سازی‌شده (بدون DOM واقعی). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Confetti } from '../src/index';

interface Ctx2D {
  scale: () => void;
  clearRect: () => void;
  save: () => void;
  restore: () => void;
  translate: () => void;
  rotate: () => void;
  fillRect: () => void;
  beginPath: () => void;
  arc: () => void;
  fill: () => void;
  globalAlpha: number;
  fillStyle: string;
}

function makeCtx(): Ctx2D {
  return {
    scale: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
  };
}

function makeCanvas(ctx: Ctx2D): Record<string, unknown> {
  return {
    getContext: () => ctx,
    clientWidth: 400,
    clientHeight: 600,
    width: 0,
    height: 0,
  };
}

describe('Confetti — چرخه‌ی کامل انیمیشن', () => {
  let rafCallbacks: FrameRequestCallback[];
  let now: number;

  beforeEach(() => {
    rafCallbacks = [];
    now = 1000;
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('performance', { now: () => now });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (v: string) => (v === '--dor-gold' ? '#d4af37' : '#4caf7d'),
    }));
    vi.stubGlobal('devicePixelRatio', 1);
    vi.stubGlobal('innerWidth', 400);
    vi.stubGlobal('innerHeight', 600);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function drive(frames: number, stepMs: number): void {
    for (let i = 0; i < frames; i++) {
      now += stepMs;
      const cb = rafCallbacks.shift();
      if (!cb) break;
      cb(now);
    }
  }

  it('ذره‌ها را رندر و در پایان onDone صدا می‌زند', () => {
    const onDone = vi.fn();
    const ctx = makeCtx();
    const inst = new Confetti({ active: true, count: 10, durationMs: 100, onDone });
    (inst as unknown as { canvas: unknown }).canvas = makeCanvas(ctx);
    (inst as unknown as { start(): void }).start();

    drive(10, 40); // 10 فریم × 40ms > 100ms
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenCalled(); // مستطیل‌ها کشیده شدند
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('componentDidMount با active=true شروع می‌کند و unmount متوقف', () => {
    const ctx = makeCtx();
    const inst = new Confetti({ active: true, count: 5, durationMs: 1000 });
    (inst as unknown as { canvas: unknown }).canvas = makeCanvas(ctx);
    inst.componentDidMount();
    expect(rafCallbacks.length).toBe(1);
    drive(2, 16);
    inst.componentWillUnmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('componentDidUpdate فقط با لبه‌ی false→true شروع می‌کند', () => {
    const ctx = makeCtx();
    const inst = new Confetti({ active: true, count: 5, durationMs: 500 });
    (inst as unknown as { canvas: unknown }).canvas = makeCanvas(ctx);
    inst.componentDidUpdate({ active: true }); // بدون لبه — نباید شروع شود
    expect(rafCallbacks.length).toBe(0);
    inst.componentDidUpdate({ active: false }); // لبه — شروع
    expect(rafCallbacks.length).toBe(1);
  });

  it('واریانت gold رنگ‌ها را از توکن‌های تم می‌خواند', () => {
    const ctx = makeCtx();
    const inst = new Confetti({ active: true, count: 3, durationMs: 50, variant: 'gold' });
    (inst as unknown as { canvas: unknown }).canvas = makeCanvas(ctx);
    (inst as unknown as { start(): void }).start();
    drive(1, 16);
    expect(ctx.fillStyle).toBeTruthy();
  });

  it('بدون context شروع نمی‌شود (گارد getContext=null)', () => {
    const inst = new Confetti({ active: true });
    (inst as unknown as { canvas: unknown }).canvas = { getContext: () => null };
    (inst as unknown as { start(): void }).start();
    expect(rafCallbacks.length).toBe(0);
  });

  it('وقتی در حال اجراست start دوباره کاری نمی‌کند (گارد running)', () => {
    const ctx = makeCtx();
    const inst = new Confetti({ active: true, count: 3, durationMs: 500 });
    (inst as unknown as { canvas: unknown }).canvas = makeCanvas(ctx);
    (inst as unknown as { start(): void }).start();
    (inst as unknown as { start(): void }).start();
    expect(rafCallbacks.length).toBe(1);
  });

  it('با prefers-reduced-motion بدون ذره onDone صدا می‌شود (fallback بدون حرکت)', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const onDone = vi.fn();
    const ctx = makeCtx();
    const inst = new Confetti({ active: true, onDone });
    (inst as unknown as { canvas: unknown }).canvas = makeCanvas(ctx);
    (inst as unknown as { start(): void }).start();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.length).toBe(0);
  });
});
