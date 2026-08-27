/**
 * چیدمان کیبورد فارسی درون-بازی — ۳ ردیف، ۳۳ کلید حرفی (۳۲ حرف + آ) + ثبت + پاک‌کردن.
 *
 * اصول طراحی:
 * - قانون فیتس (Fitts 1954): کلیدهای پرکاربرد (ا، ی، ر، ن، د، م، ت، و، ه) «پهن‌تر»
 *   هستند و در ردیف‌های میانی/پایینی (نزدیک شست) قرار دارند.
 * - حافظه‌ی عضلانی: ترتیب حروف از چیدمان استاندارد فارسی موبایل الهام گرفته تا
 *   کاربر ایرانی بدون یادگیری مجدد تایپ کند؛ بهینه‌سازی از راه «اندازه» اعمال شده.
 * - آ کلید مستقل دارد (نرمال‌سازی قراردادی «آ» را حفظ می‌کند؛ باید تایپ‌پذیر باشد).
 */

/** الفبای کامل قابل‌تایپ در بازی (پس از normalizeFa) — ۳۳ نویسه */
export const PERSIAN_LETTERS: readonly string[] = [
  'ا', 'آ', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'ژ',
  'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن',
  'و', 'ه', 'ی',
] as const;

/** حروف پرکاربرد فارسی — کلید پهن می‌گیرند (قانون فیتس) */
export const FREQUENT_LETTERS: readonly string[] = [
  'ا', 'ی', 'ر', 'ن', 'د', 'م', 'ت', 'و', 'ه',
] as const;

export type KeyType = 'letter' | 'submit' | 'backspace';

export interface KeyDef {
  id: string;
  type: KeyType;
  /** فقط برای type === 'letter' */
  letter?: string;
  /** کلید پهن (فیتس): flex بیشتر در CSS */
  wide?: boolean;
}

function letterKey(letter: string): KeyDef {
  return {
    id: `key-${letter}`,
    type: 'letter',
    letter,
    wide: FREQUENT_LETTERS.includes(letter) || undefined,
  };
}

/**
 * ردیف‌ها به ترتیب نمایش؛ داخل هر ردیف، عنصر اول = راست‌ترین کلید (RTL).
 * ردیف ۱: حروف کم‌بسامد. ردیف ۲ (home): پربسامدها در مرکز. ردیف ۳: پربسامدها + اکشن‌ها.
 */
export const KEYBOARD_ROWS: readonly (readonly KeyDef[])[] = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'خ', 'ح', 'ج', 'چ'].map(letterKey),
  ['ش', 'س', 'ی', 'ب', 'ل', 'ا', 'آ', 'ت', 'ن', 'م', 'ک', 'گ'].map(letterKey),
  [
    { id: 'key-submit', type: 'submit' as const, wide: true },
    ...['ظ', 'ط', 'ژ', 'ز', 'ر', 'ذ', 'د', 'پ', 'و', 'ه'].map(letterKey),
    { id: 'key-backspace', type: 'backspace' as const, wide: true },
  ],
] as const;

/** همه‌ی حروف چیدمان (برای تست کامل‌بودن) */
export function layoutLetters(): string[] {
  const out: string[] = [];
  for (const row of KEYBOARD_ROWS) {
    for (const k of row) {
      if (k.type === 'letter' && k.letter) out.push(k.letter);
    }
  }
  return out;
}
