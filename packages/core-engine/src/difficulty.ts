/**
 * دشواری پویا مبتنی بر نظریه‌ی Flow (Csikszentmihalyi, 1990; Chen, 2007):
 * چالش باید هم‌گام با مهارت رشد کند — نه آن‌قدر آسان که ملال بیاورد،
 * نه آن‌قدر سخت که اضطراب.
 *
 * دشواری ۱..۵ = ترکیب طول کلمه (۴..۷ حرف) و tier فراوانی کلمه:
 *
 * | دشواری | طول | freqTier هدف | توصیف |
 * |--------|-----|--------------|-------|
 * | 1      | 4   | 1 (پرکاربرد) | گرم‌کردن |
 * | 2      | 5   | 1            | آسان |
 * | 3      | 5   | 2            | متوسط |
 * | 4      | 6   | 2            | چالشی |
 * | 5      | 7   | 3 (کم‌کاربرد)| استادانه |
 *
 * الگوریتم تطبیقی ساده (کانال Flow):
 *   ۲ برد پیاپی → دشواری +۱ (چالش را بالا ببر تا ملال نیاید)
 *   ۲ باخت پیاپی → دشواری −۱ (چالش را پایین بیاور تا اضطراب نیاید)
 */
import type { FreqTier } from '@dordaneh/contracts';

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export interface DifficultyProfile {
  difficulty: number;
  wordLength: number;
  freqTier: FreqTier;
}

const PROFILES: readonly DifficultyProfile[] = [
  { difficulty: 1, wordLength: 4, freqTier: 1 },
  { difficulty: 2, wordLength: 5, freqTier: 1 },
  { difficulty: 3, wordLength: 5, freqTier: 2 },
  { difficulty: 4, wordLength: 6, freqTier: 2 },
  { difficulty: 5, wordLength: 7, freqTier: 3 },
];

/** محدودکردن دشواری به بازه‌ی معتبر ۱..۵ (ورودی غیرصحیح گرد می‌شود) */
export function clampDifficulty(d: number): number {
  const rounded = Math.round(d);
  if (Number.isNaN(rounded)) return MIN_DIFFICULTY;
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, rounded));
}

/** پروفایل (طول + tier) برای یک سطح دشواری */
export function getDifficultyProfile(difficulty: number): DifficultyProfile {
  const d = clampDifficulty(difficulty);
  return PROFILES[d - 1] as DifficultyProfile;
}

/** یک آیتم تاریخچه‌ی تمرین: برد/باخت در دشواری مشخص */
export interface PracticeHistoryItem {
  difficulty: number;
  won: boolean;
}

/**
 * پیشنهاد دشواری بعدی از روی تاریخچه (جدیدترین = آخرین عنصر آرایه).
 *
 * قاعده: از آخرین دشواری بازی‌شده شروع کن؛
 *   دو نتیجه‌ی آخر هر دو «برد» → +۱
 *   دو نتیجه‌ی آخر هر دو «باخت» → −۱
 *   در غیر این صورت (نتیجه‌ی مخلوط یا داده‌ی ناکافی) → همان سطح (کانال Flow).
 * تاریخچه‌ی خالی → دشواری ۱ (شروع امن؛ خودکارآمدی، Bandura 1977).
 */
export function suggestNextDifficulty(history: readonly PracticeHistoryItem[]): number {
  if (history.length === 0) return MIN_DIFFICULTY;

  const last = history[history.length - 1] as PracticeHistoryItem;
  const current = clampDifficulty(last.difficulty);

  if (history.length < 2) return current;

  const prev = history[history.length - 2] as PracticeHistoryItem;

  if (last.won && prev.won) return clampDifficulty(current + 1);
  if (!last.won && !prev.won) return clampDifficulty(current - 1);
  return current;
}
