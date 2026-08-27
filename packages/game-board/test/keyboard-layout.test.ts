import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import {
  FREQUENT_LETTERS,
  KEYBOARD_ROWS,
  layoutLetters,
  PERSIAN_LETTERS,
} from '../src/logic/keyboard-layout';

describe('چیدمان کیبورد فارسی', () => {
  it('۳ ردیف دارد', () => {
    expect(KEYBOARD_ROWS).toHaveLength(3);
  });

  it('همه‌ی ۳۳ حرف الفبا (۳۲ + آ) دقیقاً یک‌بار حضور دارند', () => {
    const letters = layoutLetters();
    expect(letters).toHaveLength(PERSIAN_LETTERS.length);
    expect(new Set(letters).size).toBe(letters.length);
    for (const ch of PERSIAN_LETTERS) expect(letters).toContain(ch);
  });

  it('کلیدهای ثبت و پاک‌کردن در ردیف سوم و پهن هستند', () => {
    const row3 = KEYBOARD_ROWS[2]!;
    const submit = row3.find((k) => k.type === 'submit');
    const back = row3.find((k) => k.type === 'backspace');
    expect(submit?.wide).toBe(true);
    expect(back?.wide).toBe(true);
    // ثبت راست‌ترین (اول آرایه در RTL)، پاک‌کردن چپ‌ترین
    expect(row3[0]!.type).toBe('submit');
    expect(row3[row3.length - 1]!.type).toBe('backspace');
  });

  it('حروف پرکاربرد کلید پهن دارند (قانون فیتس)', () => {
    for (const row of KEYBOARD_ROWS) {
      for (const k of row) {
        if (k.type === 'letter' && k.letter && FREQUENT_LETTERS.includes(k.letter)) {
          expect(k.wide, `کلید ${k.letter} باید پهن باشد`).toBe(true);
        }
      }
    }
  });

  it('حروف پرکاربرد در ردیف‌های ۲ و ۳ (نزدیک شست) هستند', () => {
    const row1Letters = KEYBOARD_ROWS[0]!.filter((k) => k.type === 'letter').map((k) => k.letter);
    for (const f of FREQUENT_LETTERS) expect(row1Letters).not.toContain(f);
  });

  it('همه‌ی حروف از قبل نرمال‌اند (ثبات با normalizeFa قراردادی)', () => {
    for (const ch of PERSIAN_LETTERS) expect(normalizeFa(ch)).toBe(ch);
  });

  it('idهای کلیدها یکتا هستند', () => {
    const ids = KEYBOARD_ROWS.flat().map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
