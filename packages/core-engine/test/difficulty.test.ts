/**
 * تست‌های دشواری پویا (نظریه‌ی Flow) و suggestNextDifficulty.
 */
import { describe, expect, it } from 'vitest';
import {
  clampDifficulty,
  getDifficultyProfile,
  suggestNextDifficulty,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  type PracticeHistoryItem,
} from '../src/difficulty';

function h(items: Array<[number, boolean]>): PracticeHistoryItem[] {
  return items.map(([difficulty, won]) => ({ difficulty, won }));
}

describe('clampDifficulty', () => {
  it('بازه‌ی معتبر دست نمی‌خورد', () => {
    for (let d = 1; d <= 5; d++) expect(clampDifficulty(d)).toBe(d);
  });
  it('زیر کف → ۱ و بالای سقف → ۵', () => {
    expect(clampDifficulty(0)).toBe(MIN_DIFFICULTY);
    expect(clampDifficulty(-3)).toBe(MIN_DIFFICULTY);
    expect(clampDifficulty(6)).toBe(MAX_DIFFICULTY);
    expect(clampDifficulty(99)).toBe(MAX_DIFFICULTY);
  });
  it('اعشار گرد می‌شود و NaN → ۱', () => {
    expect(clampDifficulty(2.6)).toBe(3);
    expect(clampDifficulty(Number.NaN)).toBe(MIN_DIFFICULTY);
  });
});

describe('getDifficultyProfile — نگاشت طول/tier', () => {
  it('جدول کامل دشواری → (طول، tier)', () => {
    expect(getDifficultyProfile(1)).toEqual({ difficulty: 1, wordLength: 4, freqTier: 1 });
    expect(getDifficultyProfile(2)).toEqual({ difficulty: 2, wordLength: 5, freqTier: 1 });
    expect(getDifficultyProfile(3)).toEqual({ difficulty: 3, wordLength: 5, freqTier: 2 });
    expect(getDifficultyProfile(4)).toEqual({ difficulty: 4, wordLength: 6, freqTier: 2 });
    expect(getDifficultyProfile(5)).toEqual({ difficulty: 5, wordLength: 7, freqTier: 3 });
  });
  it('ورودی خارج از بازه clamp می‌شود', () => {
    expect(getDifficultyProfile(0).difficulty).toBe(1);
    expect(getDifficultyProfile(9).difficulty).toBe(5);
  });
});

describe('suggestNextDifficulty — الگوریتم تطبیقی Flow', () => {
  it('تاریخچه‌ی خالی → دشواری ۱ (شروع امن)', () => {
    expect(suggestNextDifficulty([])).toBe(1);
  });

  it('یک بازی تنها → همان دشواری (داده‌ی ناکافی برای تغییر)', () => {
    expect(suggestNextDifficulty(h([[3, true]]))).toBe(3);
    expect(suggestNextDifficulty(h([[3, false]]))).toBe(3);
  });

  it('۲ برد پیاپی → +۱', () => {
    expect(suggestNextDifficulty(h([[2, true], [2, true]]))).toBe(3);
  });

  it('۲ باخت پیاپی → −۱', () => {
    expect(suggestNextDifficulty(h([[3, false], [3, false]]))).toBe(2);
  });

  it('نتیجه‌ی مخلوط (برد-باخت یا باخت-برد) → بدون تغییر (کانال Flow)', () => {
    expect(suggestNextDifficulty(h([[3, true], [3, false]]))).toBe(3);
    expect(suggestNextDifficulty(h([[3, false], [3, true]]))).toBe(3);
  });

  it('سقف ۵: دو برد در دشواری ۵ → همان ۵', () => {
    expect(suggestNextDifficulty(h([[5, true], [5, true]]))).toBe(5);
  });

  it('کف ۱: دو باخت در دشواری ۱ → همان ۱', () => {
    expect(suggestNextDifficulty(h([[1, false], [1, false]]))).toBe(1);
  });

  it('فقط دو نتیجه‌ی آخر ملاک است (تاریخچه‌ی بلند)', () => {
    // باخت‌های قدیمی؛ دو برد اخیر در سطح ۲ → ۳
    expect(
      suggestNextDifficulty(h([[4, false], [3, false], [2, true], [2, true]])),
    ).toBe(3);
  });

  it('دشواری خارج از بازه در تاریخچه، clamp می‌شود', () => {
    expect(suggestNextDifficulty(h([[9, true], [9, true]]))).toBe(5);
    expect(suggestNextDifficulty(h([[0, false], [0, false]]))).toBe(1);
  });

  it('مبنای Flow: سناریوی کامل صعود و نزول', () => {
    // بازیکن ماهر: 1,1 برد → 2؛ 2,2 برد → 3؛ سپس دو باخت → 2
    let d = suggestNextDifficulty(h([[1, true], [1, true]]));
    expect(d).toBe(2);
    d = suggestNextDifficulty(h([[1, true], [1, true], [2, true], [2, true]]));
    expect(d).toBe(3);
    d = suggestNextDifficulty(h([[2, true], [2, true], [3, false], [3, false]]));
    expect(d).toBe(2);
  });
});
