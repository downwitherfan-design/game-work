/**
 * @dordaneh/contracts — WordDbApi contract (implemented by AI-02 in @dordaneh/word-db).
 * Source of truth: docs/02_CONTRACTS.md §2. Locked (RFC only).
 */

export type FreqTier = 1 | 2 | 3;

export interface WordMeta {
  freqTier: FreqTier;
  category?: string;
}

export interface WordDbApi {
  /** جوابِ معمای شماره n برای طول L — قطعی و آفلاین */
  getAnswer(puzzleNumber: number, wordLength: number): string;
  getPracticeAnswer(seed: number, difficulty: number): { word: string; wordLength: number };
  /** در واژه‌نامه‌ی معتبر هست؟ (ورودی از قبل نرمال‌شده) */
  isValidWord(normalized: string): boolean;
  getWordMeta(normalized: string): WordMeta | null;
}
