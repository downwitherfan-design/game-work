/**
 * تست‌های PRNG قطعی (mulberry32 / hashInt / combineSeeds).
 */
import { describe, expect, it } from 'vitest';
import { combineSeeds, hashInt, mulberry32 } from '../src/rng';

describe('hashInt', () => {
  it('قطعی است', () => {
    expect(hashInt(812)).toBe(hashInt(812));
  });
  it('عدد صحیح نامنفی ۳۲ بیتی برمی‌گرداند', () => {
    for (const n of [0, 1, -5, 2 ** 31, 999999]) {
      const h = hashInt(n);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
  it('ورودی‌های متوالی خروجی پراکنده می‌دهند (avalanche)', () => {
    const outs = new Set<number>();
    for (let n = 1; n <= 1000; n++) outs.add(hashInt(n));
    expect(outs.size).toBe(1000); // بدون برخورد در بازه‌ی کوچک
  });
});

describe('combineSeeds', () => {
  it('قطعی و حساس به ترتیب است', () => {
    expect(combineSeeds(1, 2)).toBe(combineSeeds(1, 2));
    expect(combineSeeds(1, 2)).not.toBe(combineSeeds(2, 1));
  });
  it('جفت‌های متفاوت → خروجی متفاوت (نمونه‌ای)', () => {
    const outs = new Set<number>();
    for (let a = 0; a < 30; a++) for (let b = 1; b <= 5; b++) outs.add(combineSeeds(a, b));
    expect(outs.size).toBe(150);
  });
});

describe('mulberry32', () => {
  it('دنباله‌ی قطعی: seed یکسان → دنباله‌ی یکسان', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it('خروجی در بازه‌ی [0,1) است', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('seed های متفاوت → دنباله‌های متفاوت', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it('میانگین حدوداً ۰٫۵ (یکنواختی تقریبی)', () => {
    const rng = mulberry32(123);
    let sum = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) sum += rng();
    expect(sum / N).toBeGreaterThan(0.47);
    expect(sum / N).toBeLessThan(0.53);
  });
});
