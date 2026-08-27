import { describe, expect, it } from 'vitest';
import { hashPuzzleNumber, isDordanehDay } from '../src/dordaneh-day';

describe('روز دُردانه — پاداش متغیر قطعی (Ferster & Skinner 1957)', () => {
  it('قطعی است: همان ورودی → همان خروجی', () => {
    for (const n of [1, 7, 100, 812]) {
      expect(isDordanehDay(n)).toBe(isDordanehDay(n));
      expect(hashPuzzleNumber(n)).toBe(hashPuzzleNumber(n));
    }
  });

  it('فرکانس ~۱ از ۷ در بازه‌ی بلند (±۳۵٪ تلورانس)', () => {
    const N = 3500;
    let hits = 0;
    for (let n = 1; n <= N; n++) if (isDordanehDay(n)) hits++;
    const expected = N / 7;
    expect(hits).toBeGreaterThan(expected * 0.65);
    expect(hits).toBeLessThan(expected * 1.35);
  });

  it('شبه‌تصادفی: نه متناوبِ ساده (روزهای متوالی الگوی ثابت ندارند)', () => {
    // در ۱۰۰ روز اول باید هم دو دُردانه‌ی نزدیک هم گپ بلند وجود داشته باشد
    const gaps: number[] = [];
    let last = 0;
    for (let n = 1; n <= 200; n++) {
      if (isDordanehDay(n)) {
        if (last > 0) gaps.push(n - last);
        last = n;
      }
    }
    expect(gaps.length).toBeGreaterThan(5);
    expect(new Set(gaps).size).toBeGreaterThan(2); // گپ‌ها متنوع‌اند نه دوره‌ی ثابت
  });

  it('ورودی نامعتبر → false (fail-soft)', () => {
    expect(isDordanehDay(0)).toBe(false);
    expect(isDordanehDay(-5)).toBe(false);
    expect(isDordanehDay(NaN)).toBe(false);
    expect(isDordanehDay(Infinity)).toBe(false);
  });

  it('اعشار به روز صحیح گرد می‌شود', () => {
    expect(isDordanehDay(7.9)).toBe(isDordanehDay(7));
  });
});
