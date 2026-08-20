/**
 * تست‌های «روز دُردانه» — پاداش متغیر قطعی (Skinner 1957) با نرخ ~۱/۷.
 */
import { describe, expect, it } from 'vitest';
import { isDordanehDay } from '../src/dordaneh-day';

describe('isDordanehDay', () => {
  it('قطعی است: فراخوانی تکراری همان نتیجه را می‌دهد', () => {
    for (const n of [1, 7, 100, 812, 5000]) {
      expect(isDordanehDay(n)).toBe(isDordanehDay(n));
    }
  });

  it('boolean برمی‌گرداند', () => {
    expect(typeof isDordanehDay(1)).toBe('boolean');
  });

  it('نرخ کلی حدوداً ۱/۷ است (بازه‌ی ۱۰٪..۱۹٪ روی ۱۰هزار روز)', () => {
    let hits = 0;
    const N = 10_000;
    for (let n = 1; n <= N; n++) if (isDordanehDay(n)) hits++;
    const rate = hits / N;
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.19);
  });

  it('شبه‌تصادفی است، نه دوره‌ای: الگوی «هر ۷ روز دقیقاً یک‌بار» ندارد', () => {
    // اگر دوره‌ای بود، isDordanehDay(n) == isDordanehDay(n+7) برای همه‌ی n
    let same = 0;
    const N = 1000;
    for (let n = 1; n <= N; n++) if (isDordanehDay(n) === isDordanehDay(n + 7)) same++;
    expect(same).toBeLessThan(N); // حداقل یک شکست در دوره‌ی ۷تایی
  });

  it('در هر پنجره‌ی ۶۰ روزه حداقل یک روز دُردانه هست (تحمل خشکسالی پاداش)', () => {
    for (let start = 1; start <= 2000; start += 60) {
      let found = false;
      for (let n = start; n < start + 60; n++) {
        if (isDordanehDay(n)) {
          found = true;
          break;
        }
      }
      expect(found, `پنجره‌ی ${start}..${start + 59}`).toBe(true);
    }
  });

  it('روی سال اول (۱..۳۶۵) تعداد معقولی روز دُردانه دارد', () => {
    let hits = 0;
    for (let n = 1; n <= 365; n++) if (isDordanehDay(n)) hits++;
    expect(hits).toBeGreaterThanOrEqual(30); // نه خیلی خسیس
    expect(hits).toBeLessThanOrEqual(80); // نه خیلی ولخرج
  });
});
