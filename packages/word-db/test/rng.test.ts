import { describe, expect, it } from 'vitest';
import { mulberry32, seededIndex } from '../src/rng';

describe('mulberry32', () => {
  it('قطعی: seed یکسان = دنباله‌ی یکسان', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('خروجی در بازه‌ی [0,1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('seedهای متفاوت دنباله‌ی متفاوت می‌دهند', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('توزیع تقریبا یکنواخت (میانگین ~0.5)', () => {
    const r = mulberry32(123);
    let sum = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) sum += r();
    expect(sum / N).toBeGreaterThan(0.47);
    expect(sum / N).toBeLessThan(0.53);
  });
});

describe('seededIndex', () => {
  it('در بازه‌ی [0, max) است', () => {
    for (let seed = 0; seed < 500; seed++) {
      const i = seededIndex(seed, 10);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(10);
      expect(Number.isInteger(i)).toBe(true);
    }
  });

  it('max نامعتبر → صفر', () => {
    expect(seededIndex(5, 0)).toBe(0);
    expect(seededIndex(5, -3)).toBe(0);
  });

  it('قطعی است', () => {
    expect(seededIndex(99, 1000)).toBe(seededIndex(99, 1000));
  });
});
