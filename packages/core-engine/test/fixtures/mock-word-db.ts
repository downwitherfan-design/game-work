/**
 * Mock دیتابیس کلمات — فقط برای تست (کد تولیدی به اینترفیس WordDbApi وابسته است
 * و word-db از بیرون تزریق می‌شود: dependency injection).
 * آرایه‌ی ۳۰ کلمه‌ای طبق دستور فاز ۱ تا آماده‌شدن @dordaneh/word-db.
 * همه‌ی کلمات از قبل نرمال هستند (ی/ک فارسی، بدون اعراب/ZWNJ).
 */
import type { WordDbApi, WordMeta } from '@dordaneh/contracts';

/** ۳۰ کلمه‌ی جواب ۶ حرفی (هر کدام دقیقاً ۶ code point پس از نرمال‌سازی) */
export const ANSWERS_6: readonly string[] = [
  'دردانه', // د ر د ا ن ه — حرف تکراری «د»
  'کتابها',
  'گلدسته',
  'ایرانی', // «ا» و «ی» تکراری
  'باغبان', // «ب» و «ا» تکراری
  'دلاوری',
  'سرزمین',
  'خورشید',
  'مهربان',
  'ستایشی',
  'پرستار',
  'گلستان',
  'آبادان', // شروع با «آ» + «ا» تکراری
  'زمستان',
  'دبیران',
  'دبستان',
  'خیابان',
  'آسمانی', // شروع با «آ»
  'بازیکن',
  'نوروزی',
  'پیروزی',
  'دوستان',
  'میهمان',
  'فرهنگی',
  'ارغوان',
  'کبوترک',
  'شادمان',
  'قهرمان',
  'ارزانی',
  'بارانی',
] as const;

/** کلمات تمرینی برحسب طول (۴..۷) */
export const PRACTICE_BY_LENGTH: Readonly<Record<number, readonly string[]>> = {
  4: ['کتاب', 'مادر', 'آباد', 'دوست', 'شادی'],
  5: ['باران', 'آرامش', 'ستاره', 'کتابی', 'مدادی'],
  6: ANSWERS_6,
  7: ['دانشمند', 'مهمانان', 'سرافراز', 'کتابدار'],
};

/** واژه‌نامه‌ی معتبر برای isValidWord */
export const VALID_WORDS = new Set<string>([
  ...ANSWERS_6,
  ...(PRACTICE_BY_LENGTH[4] as readonly string[]),
  ...(PRACTICE_BY_LENGTH[5] as readonly string[]),
  ...(PRACTICE_BY_LENGTH[7] as readonly string[]),
  // حدس‌های معتبرِ غیر-جواب برای تست‌های حروف تکراری و فارسی
  'دندانه', // د ن د ا ن ه
  'دادگاه', // د ا د گ ا ه — «د» و «ا» تکراری
  'نادانی',
  'انسانی',
  'داداشی', // د ا د ا ش ی
  'آبانان', // آ ب ا ن ا ن — برای تست «آ»
  'نانوای', // ن ا ن و ا ی
  'دارایی', // د ا ر ا ی ی
  'هدهدها', // ه د ه د ه ا — تکرار سنگین
  'ددددده', // حدی: پنج «د»
  'ااااان', // حدی: پنج «ا»
  'نگهبان',
  'باستان',
  'راستان',
  'دستانه',
]);

export interface MockCall {
  method: string;
  args: unknown[];
}

/** ساخت mock سازگار با WordDbApi قرارداد + ثبت فراخوانی‌ها برای تست DI */
export function createMockWordDb(): WordDbApi & { calls: MockCall[] } {
  const calls: MockCall[] = [];
  return {
    calls,
    getAnswer(puzzleNumber: number, wordLength: number): string {
      calls.push({ method: 'getAnswer', args: [puzzleNumber, wordLength] });
      if (wordLength !== 6) throw new Error(`mock فقط طول ۶ دارد، نه ${wordLength}`);
      // قرارداد §2: ایندکس = puzzleNumber % طول آرایه
      const idx = ((puzzleNumber % ANSWERS_6.length) + ANSWERS_6.length) % ANSWERS_6.length;
      return ANSWERS_6[idx] as string;
    },
    getPracticeAnswer(seed: number, difficulty: number): { word: string; wordLength: number } {
      calls.push({ method: 'getPracticeAnswer', args: [seed, difficulty] });
      const lengthByDifficulty: Record<number, number> = { 1: 4, 2: 5, 3: 5, 4: 6, 5: 7 };
      const len = lengthByDifficulty[difficulty] ?? 6;
      const pool = PRACTICE_BY_LENGTH[len] as readonly string[];
      const idx = ((seed % pool.length) + pool.length) % pool.length;
      const word = pool[idx] as string;
      return { word, wordLength: Array.from(word).length };
    },
    isValidWord(normalized: string): boolean {
      calls.push({ method: 'isValidWord', args: [normalized] });
      return VALID_WORDS.has(normalized);
    },
    getWordMeta(normalized: string): WordMeta | null {
      calls.push({ method: 'getWordMeta', args: [normalized] });
      return VALID_WORDS.has(normalized) ? { freqTier: 1 } : null;
    },
  };
}
