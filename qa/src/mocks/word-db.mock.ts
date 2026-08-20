/**
 * @dordaneh/qa — mock مرجع WordDbApi (تا آماده‌شدن @dordaneh/word-db واقعی از AI-02).
 * فقط برای تست — طبق docs/02_CONTRACTS.md §2:
 *   - ایندکس جواب = puzzleNumber % طول آرایه
 *   - همه‌ی جواب‌ها نرمال، طول درست، خارج از blocklist، داخل valid-words.
 */

import { normalizeFa, type WordDbApi, type WordMeta } from '@dordaneh/contracts';

/** جواب‌های ۶ حرفی (پس از نرمال‌سازی دقیقاً ۶ code point) */
export const MOCK_ANSWERS_6: readonly string[] = [
  'دردانه',
  'خورشید',
  'مهربان',
  'باغبان',
  'دبستان',
  'گلستان',
  'زمستان',
  'آبادان',
  'ایرانی',
  'دلاویز',
  'شاهکار',
  'سرزمین',
];

/** جواب‌های تمرینی به تفکیک طول (۴ تا ۷) */
export const MOCK_PRACTICE: Readonly<Record<number, readonly string[]>> = {
  4: ['کتاب', 'باران', 'دریا', 'ستون'].map(normalizeFa).filter((w) => [...w].length === 4),
  5: ['ستاره', 'آسمان', 'پرنده', 'دفترچ'].map(normalizeFa).filter((w) => [...w].length === 5),
  6: [...MOCK_ANSWERS_6],
  7: ['تابستان', 'کتابخانه'].map(normalizeFa).filter((w) => [...w].length === 7),
};

/** واژه‌های معتبر اضافی برای حدس‌زدن در تست‌ها */
export const MOCK_EXTRA_VALID: readonly string[] = [
  'بادبان',
  'نادانی',
  'دانادل',
  'بستانی',
  'رنگارنگ',
  'نانوان',
];

export const MOCK_BLOCKLIST: readonly string[] = ['بدواژه'];

export function createMockWordDb(): WordDbApi {
  const valid = new Set<string>([
    ...MOCK_ANSWERS_6,
    ...Object.values(MOCK_PRACTICE).flat(),
    ...MOCK_EXTRA_VALID.map(normalizeFa),
  ]);

  return {
    getAnswer(puzzleNumber: number, wordLength: number): string {
      const pool = MOCK_PRACTICE[wordLength] ?? MOCK_ANSWERS_6;
      const idx = ((puzzleNumber % pool.length) + pool.length) % pool.length;
      return pool[idx] as string;
    },
    getPracticeAnswer(seed: number, difficulty: number): { word: string; wordLength: number } {
      // دشواری ۱..۵ → طول ۴..۷ (قطعی)
      const lengths = [4, 4, 5, 6, 7] as const;
      const clamped = Math.min(5, Math.max(1, Math.floor(difficulty)));
      const wordLength = lengths[clamped - 1] as number;
      const pool = MOCK_PRACTICE[wordLength] as readonly string[];
      const idx = ((seed % pool.length) + pool.length) % pool.length;
      return { word: pool[idx] as string, wordLength };
    },
    isValidWord(normalized: string): boolean {
      return valid.has(normalized) && !MOCK_BLOCKLIST.includes(normalized);
    },
    getWordMeta(normalized: string): WordMeta | null {
      if (!valid.has(normalized)) return null;
      return { freqTier: 1 };
    },
  };
}

// ---------------------------------------------------------------------------
// دیتابیس ساختگی انگلیسی ۵ حرفی — «تست تعویض دیتابیس» (اثبات جداسازی موتور/محتوا
// برای هدف راهبردی صادرات؛ MASTER_PLAN ستون ۴).
// ---------------------------------------------------------------------------

export const MOCK_ANSWERS_EN_5: readonly string[] = [
  'crane',
  'slate',
  'pearl',
  'house',
  'sound',
  'light',
  'world',
  'apple',
];

export const MOCK_EXTRA_VALID_EN: readonly string[] = ['about', 'other', 'their', 'lever', 'eerie'];

export function createMockWordDbEnglish(): WordDbApi {
  const valid = new Set<string>([...MOCK_ANSWERS_EN_5, ...MOCK_EXTRA_VALID_EN]);
  return {
    getAnswer(puzzleNumber: number): string {
      const idx =
        ((puzzleNumber % MOCK_ANSWERS_EN_5.length) + MOCK_ANSWERS_EN_5.length) %
        MOCK_ANSWERS_EN_5.length;
      return MOCK_ANSWERS_EN_5[idx] as string;
    },
    getPracticeAnswer(seed: number): { word: string; wordLength: number } {
      const idx =
        ((seed % MOCK_ANSWERS_EN_5.length) + MOCK_ANSWERS_EN_5.length) % MOCK_ANSWERS_EN_5.length;
      return { word: MOCK_ANSWERS_EN_5[idx] as string, wordLength: 5 };
    },
    isValidWord(normalized: string): boolean {
      return valid.has(normalized);
    },
    getWordMeta(normalized: string): WordMeta | null {
      return valid.has(normalized) ? { freqTier: 1 } : null;
    },
  };
}
