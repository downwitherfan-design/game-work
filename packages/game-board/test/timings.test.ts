import { describe, expect, it } from 'vitest';
import { flipDelayMs, revealMomentMs, revealTotalMs, TIMINGS } from '../src/logic/timings';
import { prefersReducedMotion } from '../src/logic/reduced-motion';

describe('زمان‌بندی انیمیشن‌ها', () => {
  it('stagger فلیپ ~250ms طبق مشخصات است', () => {
    expect(TIMINGS.flipStaggerMs).toBe(250);
    expect(flipDelayMs(0)).toBe(0);
    expect(flipDelayMs(3)).toBe(750);
  });

  it('لحظه‌ی نمایش رنگ = نیمه‌ی چرخش کاشی', () => {
    expect(revealMomentMs(0)).toBe(Math.round(TIMINGS.flipDurationMs / 2));
    expect(revealMomentMs(2)).toBe(500 + Math.round(TIMINGS.flipDurationMs / 2));
  });

  it('کل زمان reveal ردیف ۶حرفی', () => {
    expect(revealTotalMs(6)).toBe(flipDelayMs(5) + TIMINGS.flipDurationMs);
    expect(revealTotalMs(0)).toBe(0);
    expect(revealTotalMs(-1)).toBe(0);
  });

  it('پاپ تایپ زیر آستانه‌ی Doherty (100ms) شروع می‌شود', () => {
    // انیمیشن فوراً شروع می‌شود؛ مدتش هم کوتاه است
    expect(TIMINGS.tapPopMs).toBeLessThanOrEqual(150);
  });
});

describe('prefers-reduced-motion', () => {
  it('با matchMedia تزریقی true/false درست می‌دهد', () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it('بدون matchMedia (محیط Node) false و بدون خطا', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('خطای matchMedia بلعیده می‌شود (fail-soft)', () => {
    expect(
      prefersReducedMotion(() => {
        throw new Error('boom');
      }),
    ).toBe(false);
  });
});
