import { describe, expect, it } from 'vitest';
import faMessages from '../locales/fa.json';
import { t, tFa, toastText } from '../src/i18n';

describe('i18n پکیج game-board', () => {
  it('همه‌ی کلیدها پیشوند gameBoard. دارند (قرارداد §11)', () => {
    for (const key of Object.keys(faMessages)) {
      expect(key.startsWith('gameBoard.')).toBe(true);
    }
  });

  it('t کلید موجود را ترجمه و کلید گمشده را برمی‌گرداند (fail-soft)', () => {
    expect(t('gameBoard.submit')).toBe('ثبت');
    expect(t('gameBoard.__missing__')).toBe('gameBoard.__missing__');
  });

  it('tFa پارامتر جایگذاری و ارقام را فارسی می‌کند', () => {
    const out = tFa('gameBoard.wrongLength', { n: 6 });
    expect(out).toContain('۶');
    expect(out).not.toContain('6');
  });

  it('toastText کدهای کنترلر را به پیام کاربر تبدیل می‌کند', () => {
    expect(toastText('INVALID_WORD')).toBe('این کلمه رو نمی‌شناسم!');
    expect(toastText('WRONG_LENGTH:6')).toContain('۶');
    expect(toastText('HINT_UNAVAILABLE')).toBe('فعلاً راهنمایی در دسترس نیست');
    expect(toastText('متن دلخواه')).toBe('متن دلخواه');
  });

  it('هیچ مقدار locale خالی نیست', () => {
    for (const [k, v] of Object.entries(faMessages)) {
      expect(v.trim().length, `مقدار ${k} خالی است`).toBeGreaterThan(0);
    }
  });
});
