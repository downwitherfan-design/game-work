/**
 * نگاشت کیبورد فیزیکی دسکتاپ → اکشن بازی.
 * - حروف فارسی مستقیم (چیدمان فارسی سیستم‌عامل) + نرمال‌سازی عربی (ي→ی، ك→ک).
 * - فالبک QWERTY انگلیسی → چیدمان استاندارد فارسی ویندوز (کاربر بدون کیبورد فارسی).
 * - Enter = ثبت، Backspace = پاک‌کردن.
 */

import { normalizeFa } from '@dordaneh/contracts';
import { PERSIAN_LETTERS } from './keyboard-layout';

export type KeyAction =
  | { kind: 'letter'; letter: string }
  | { kind: 'submit' }
  | { kind: 'backspace' };

const LETTER_SET: ReadonlySet<string> = new Set(PERSIAN_LETTERS);

/** نگاشت QWERTY → چیدمان استاندارد فارسی (Windows) */
const QWERTY_TO_FA: Readonly<Record<string, string>> = {
  q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح',
  '[': 'ج', ']': 'چ',
  a: 'ش', s: 'س', d: 'ی', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م',
  ';': 'ک', "'": 'گ',
  z: 'ظ', x: 'ط', c: 'ز', v: 'ر', b: 'ذ', n: 'د', m: 'پ', ',': 'و',
  // Shift+H در چیدمان فارسی = آ ؛ Shift+C = ژ
  H: 'آ', C: 'ژ',
};

export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * تبدیل رویداد keydown به اکشن بازی؛ null یعنی «به ما مربوط نیست»
 * (میان‌برهای مرورگر مثل Ctrl+R هرگز بلعیده نمی‌شوند).
 */
export function mapKeyEvent(e: KeyEventLike): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === 'Enter') return { kind: 'submit' };
  if (e.key === 'Backspace') return { kind: 'backspace' };
  if (e.key.length !== 1) return null;

  // ۱) حرف فارسی مستقیم (یا معادل عربی که نرمال می‌شود)
  const fa = normalizeFa(e.key);
  if (fa.length === 1 && LETTER_SET.has(fa)) return { kind: 'letter', letter: fa };

  // ۲) فالبک QWERTY (اول با حفظ Shift برای آ/ژ، بعد lowercase)
  const mapped = QWERTY_TO_FA[e.key] ?? QWERTY_TO_FA[e.key.toLowerCase()];
  if (mapped) return { kind: 'letter', letter: mapped };

  return null;
}
