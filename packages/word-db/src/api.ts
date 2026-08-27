/**
 * پیاده‌سازی WordDbApi — قرارداد docs/02_CONTRACTS.md §2.
 * قطعی (deterministic)، آفلاین، بدون وابستگی جز @dordaneh/contracts.
 */
import type { FreqTier, WordDbApi, WordMeta } from '@dordaneh/contracts';
import {
  answers6,
  answersMeta,
  practiceByTier,
  validWordSet,
  wordMetaMap,
} from './data';
import { seededIndex } from './rng';

/**
 * نگاشت دشواری بازی (1..5 طبق EngineApi) به tier فرکانسی (1..3):
 * 1→T1 خیلی رایج، 2→T1، 3→T2، 4→T2، 5→T3 دشوار.
 */
export function difficultyToTier(difficulty: number): FreqTier {
  const d = Math.min(5, Math.max(1, Math.round(difficulty)));
  if (d <= 2) return 1;
  if (d <= 4) return 2;
  return 3;
}

/** ایندکس قطعی جواب روزانه: puzzleNumber از 1 شروع می‌شود (قرارداد §0). */
function dailyIndex(puzzleNumber: number, poolSize: number): number {
  // نگهبان در برابر ورودی نامعتبر — همیشه ایندکس معتبر برگردان
  const n = Number.isFinite(puzzleNumber) ? Math.trunc(puzzleNumber) : 1;
  return ((((n - 1) % poolSize) + poolSize) % poolSize);
}

export const wordDb: WordDbApi = {
  getAnswer(puzzleNumber: number, wordLength: number): string {
    if (wordLength !== 6) {
      // MVP روزانه فقط ۶حرفی است (قرارداد). طول دیگر → از استخر تمرین قطعی.
      const pool = practicePool(wordLength);
      if (pool.length === 0) {
        throw new Error(`word-db: no answers for length ${String(wordLength)}`);
      }
      const idx = dailyIndex(puzzleNumber, pool.length);
      // pool غیرخالی است و idx در بازه — non-null قطعی
      return pool[idx] as string;
    }
    const idx = dailyIndex(puzzleNumber, answers6.length);
    return answers6[idx] as string;
  },

  getPracticeAnswer(seed: number, difficulty: number): { word: string; wordLength: number } {
    const tier = difficultyToTier(difficulty);
    // fallback زنجیره‌ای: اگر tier خالی بود (نباید باشد)، به tier نزدیک‌تر
    const tiers: FreqTier[] = tier === 1 ? [1, 2, 3] : tier === 2 ? [2, 1, 3] : [3, 2, 1];
    for (const t of tiers) {
      const pool = practiceByTier[t];
      if (pool.length > 0) {
        const entry = pool[seededIndex(Math.trunc(seed), pool.length)] as {
          word: string;
          wordLength: number;
        };
        return { word: entry.word, wordLength: entry.wordLength };
      }
    }
    // غیرقابل‌وقوع با داده‌ی معتبر — اما هرگز undefined برنگردان
    throw new Error('word-db: practice pools are empty');
  },

  isValidWord(normalized: string): boolean {
    return validWordSet.has(normalized);
  },

  getWordMeta(normalized: string): WordMeta | null {
    const a = answersMeta[normalized];
    if (a) return a;
    return wordMetaMap.get(normalized) ?? null;
  },
};

// ---------------------------------------------------------------------------
// استخر قطعی برای طول‌های غیر ۶ (تمرین/آنبوردینگ) — مرتب بر اساس tier سپس الفبا
// تا ترتیب بین بیلدها پایدار بماند.
// ---------------------------------------------------------------------------
const poolCache = new Map<number, readonly string[]>();
function practicePool(wordLength: number): readonly string[] {
  const cached = poolCache.get(wordLength);
  if (cached) return cached;
  const words: string[] = [];
  for (const t of [1, 2, 3] as const) {
    const tierWords = practiceByTier[t]
      .filter((p) => p.wordLength === wordLength)
      .map((p) => p.word)
      .sort((a, b) => a.localeCompare(b, 'fa'));
    words.push(...tierWords);
  }
  poolCache.set(wordLength, words);
  return words;
}
