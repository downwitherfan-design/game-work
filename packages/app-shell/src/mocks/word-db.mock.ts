/**
 * Mock قراردادیِ WordDbApi (مالک واقعی: AI-02 در @dordaneh/word-db).
 * موتور واقعی core-engine با تزریق وابستگی createEngine({ wordDb }) ساخته می‌شود؛
 * تا آماده‌شدن پکیج واقعی، این mock قطعی/آفلاین به‌جای آن تزریق می‌شود
 * (سوییچ خودکار در services/registry — هرگز منتظر کسی نمی‌مانیم).
 *
 * قواعد mock:
 *  - getAnswer قطعی است: جواب معمای شماره n = answers[n mod len]
 *  - getPracticeAnswer(0, 1) عمداً «دردانه» برمی‌گرداند تا معمای آنبوردینگ
 *    (پیروزی ۳۰ ثانیه‌ای) همان کلمه‌ی آشنای نام بازی باشد.
 *  - isValidWord سهل‌گیر است: هر رشته‌ی تمام-فارسیِ نرمال‌شده معتبر است
 *    (mock نباید جریان بازی را با واژه‌نامه‌ی ناقص بشکند).
 */
import { normalizeFa, type WordDbApi, type WordMeta } from '@dordaneh/contracts';

/** واژه‌های امن و پرکاربرد فارسی معیار — داده‌ی mock، نه متن UI */
function pool(len: number, words: string[]): string[] {
  const filtered = words.map(normalizeFa).filter((w) => Array.from(w).length === len);
  // استخر هرگز نباید خالی بماند — mock نباید موتور را بشکند
  return filtered.length > 0 ? filtered : [normalizeFa('دردانه')];
}

const ANSWERS_BY_LENGTH: Record<number, string[]> = {
  4: pool(4, ['کتاب', 'دوست', 'مادر', 'نگاه']),
  5: pool(5, ['ستاره', 'آسمان', 'لبخند', 'باران']),
  6: pool(6, ['دردانه', 'گلستان', 'مهربان', 'ارغوان', 'باغبان', 'کتابچه']),
  7: pool(7, ['کتابدار', 'باغستان', 'مهربانی']),
};

/** جواب دست‌چین آنبوردینگ — seed=0, difficulty=1 (قرارداد ضمنی موتور واقعی) */
const ONBOARDING_WORD = normalizeFa('دردانه');

const FA_ONLY = /^[\u0600-\u06FF\u200c]+$/;

function pickDeterministic(list: string[], seed: number): string {
  const idx = ((seed % list.length) + list.length) % list.length;
  return list[idx] as string;
}

export function createMockWordDb(): WordDbApi {
  return {
    getAnswer(puzzleNumber: number, wordLength: number): string {
      const answers = ANSWERS_BY_LENGTH[wordLength] ?? ANSWERS_BY_LENGTH[6] ?? [ONBOARDING_WORD];
      return pickDeterministic(answers, puzzleNumber);
    },

    getPracticeAnswer(seed: number, difficulty: number): { word: string; wordLength: number } {
      // آنبوردینگ: موتور واقعی با (0, 1) صدا می‌زند → کلمه‌ی آسانِ آشنا
      if (seed === 0 && difficulty === 1) {
        return { word: ONBOARDING_WORD, wordLength: Array.from(ONBOARDING_WORD).length };
      }
      // دشواری → طول کلمه (۱..۲→۴، ۳→۵، ۴→۶، ۵+→۷) — نگاشت mock، نه منطق نهایی AI-02
      const length = difficulty <= 2 ? 4 : difficulty === 3 ? 5 : difficulty === 4 ? 6 : 7;
      const answers = ANSWERS_BY_LENGTH[length] ?? ANSWERS_BY_LENGTH[6] ?? [ONBOARDING_WORD];
      const word = pickDeterministic(answers, seed);
      return { word, wordLength: Array.from(word).length };
    },

    isValidWord(normalized: string): boolean {
      // سهل‌گیر: تمام-فارسی و غیرخالی = معتبر (mock نباید بازی را قفل کند)
      return normalized.length > 0 && FA_ONLY.test(normalized);
    },

    getWordMeta(normalized: string): WordMeta | null {
      for (const pool of Object.values(ANSWERS_BY_LENGTH)) {
        if (pool.includes(normalized)) return { freqTier: 1 };
      }
      return FA_ONLY.test(normalized) ? { freqTier: 3 } : null;
    },
  };
}
