/**
 * تست قرارداد توابع هسته‌ی @dordaneh/contracts:
 * normalizeFa / toPersianDigits / puzzleNumberForDate (مرز نیمه‌شب تهران —
 * پرریسک‌ترین باگ محصول: اگر شماره‌ی معما دیر/زود عوض شود، استریک کاربر می‌سوزد).
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeFa,
  puzzleNumberForDate,
  puzzleNumberForNow,
  tehranDateString,
  toPersianDigits,
  PUZZLE_EPOCH,
} from '@dordaneh/contracts';

describe('normalizeFa — قواعد سند ۰۰ §3', () => {
  it('ي عربی → ی فارسی', () => {
    expect(normalizeFa('\u064A\u0627\u0631')).toBe('یار');
  });
  it('ك عربی → ک فارسی', () => {
    expect(normalizeFa('\u0643\u062A\u0627\u0628')).toBe('کتاب');
  });
  it('ۀ → ه', () => {
    expect(normalizeFa('خان\u06C0')).toBe('خانه');
  });
  it('اعراب حذف می‌شود', () => {
    expect(normalizeFa('کِتاب')).toBe('کتاب');
    expect(normalizeFa('مُدَرِّس')).toBe('مدرس');
  });
  it('ZWNJ در مقایسه حذف می‌شود', () => {
    expect(normalizeFa('نیم\u200Cفاصله')).toBe('نیمفاصله');
  });
  it('آ حفظ می‌شود (نباید به ا تبدیل شود)', () => {
    expect(normalizeFa('آباد')).toBe('آباد');
    expect(normalizeFa('آباد')).toContain('آ');
  });
  it('تطویل (ـ) حذف می‌شود', () => {
    expect(normalizeFa('کـتـاب')).toBe('کتاب');
  });
});

describe('toPersianDigits', () => {
  it('همه‌ی ارقام لاتین → فارسی', () => {
    expect(toPersianDigits(812)).toBe('۸۱۲');
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });
  it('متن مخلوط: فقط ارقام عوض می‌شوند', () => {
    expect(toPersianDigits('دُردانه #812')).toBe('دُردانه #۸۱۲');
  });
});

describe('puzzleNumber — مرز نیمه‌شب تهران (Asia/Tehran)', () => {
  // تهران در 2026 (پس از حذف DST ایران در 1401/2022): همیشه UTC+3:30
  // نیمه‌شب تهران = 20:30 UTC روز قبل.

  it('روز مبدأ (2026-09-01 تهران) = معمای شماره‌ی ۱', () => {
    // 2026-09-01T00:00:00 تهران == 2026-08-31T20:30:00Z
    expect(puzzleNumberForDate(new Date('2026-08-31T20:30:00Z'))).toBe(1);
    expect(puzzleNumberForDate(new Date('2026-09-01T12:00:00Z'))).toBe(1);
  });

  it('یک میلی‌ثانیه قبل از نیمه‌شب تهران هنوز معمای روز قبل است', () => {
    // نیمه‌شب تهرانِ 2026-09-02 == 2026-09-01T20:30:00Z
    expect(puzzleNumberForDate(new Date('2026-09-01T20:29:59.999Z'))).toBe(1);
    expect(puzzleNumberForDate(new Date('2026-09-01T20:30:00.000Z'))).toBe(2);
  });

  it('۱۰۰ روز بعد از مبدأ = معمای ۱۰۱ (بدون off-by-one)', () => {
    const t = Date.parse('2026-08-31T20:30:00Z') + 100 * 86_400_000;
    expect(puzzleNumberForDate(new Date(t))).toBe(101);
  });

  it('در طول یک روز کامل تهران، شماره ثابت می‌ماند (هر ساعت چک)', () => {
    const dayStart = Date.parse('2026-09-01T20:30:00Z'); // شروع معمای ۲
    for (let h = 0; h < 24; h++) {
      const at = new Date(dayStart + h * 3_600_000);
      expect(puzzleNumberForDate(at), `hour ${h}`).toBe(2);
    }
  });

  it('شماره‌ی معما اکیداً صعودی است — روی ۴۰۰ روز، هر روز دقیقاً +۱', () => {
    const start = Date.parse('2026-08-31T21:00:00Z');
    let prev = puzzleNumberForDate(new Date(start));
    for (let d = 1; d <= 400; d++) {
      const n = puzzleNumberForDate(new Date(start + d * 86_400_000));
      expect(n, `day +${d}`).toBe(prev + 1);
      prev = n;
    }
  });

  it('tehranDateString فرمت YYYY-MM-DD می‌دهد و مبدأ ثابت است', () => {
    expect(tehranDateString(new Date('2026-08-31T20:30:00Z'))).toBe('2026-09-01');
    expect(PUZZLE_EPOCH).toBe('2026-09-01');
  });

  it('puzzleNumberForNow عدد صحیح برمی‌گرداند', () => {
    expect(Number.isInteger(puzzleNumberForNow())).toBe(true);
  });
});
