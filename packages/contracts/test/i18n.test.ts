import { describe, it, expect } from 'vitest';
import { createTranslator, DEFAULT_LOCALE } from '../src/i18n';

describe('DEFAULT_LOCALE', () => {
  it('فارسی است', () => {
    expect(DEFAULT_LOCALE).toBe('fa');
  });
});

describe('createTranslator', () => {
  const t = createTranslator({
    'gameBoard.submit': 'ثبت حدس',
    'streak.days': 'رشته‌ی {count} روزه',
    'duel.vs': '{a} در برابر {b}',
    'weird.keep': 'مقدار {missing} ثابت می‌ماند',
  });

  it('کلید موجود را برمی‌گرداند', () => {
    expect(t('gameBoard.submit')).toBe('ثبت حدس');
  });

  it('کلید گمشده → خود کلید (fail-soft، UI نمی‌شکند)', () => {
    expect(t('no.such.key')).toBe('no.such.key');
  });

  it('پارامترها را جایگذاری می‌کند (عدد و رشته)', () => {
    expect(t('streak.days', { count: 7 })).toBe('رشته‌ی 7 روزه');
    expect(t('duel.vs', { a: 'سارا', b: 'رضا' })).toBe('سارا در برابر رضا');
  });

  it('پارامتر تعریف‌نشده در params → placeholder دست‌نخورده می‌ماند', () => {
    expect(t('weird.keep', { other: 1 })).toBe('مقدار {missing} ثابت می‌ماند');
  });

  it('بدون params → قالب خام برمی‌گردد', () => {
    expect(t('streak.days')).toBe('رشته‌ی {count} روزه');
  });
});
