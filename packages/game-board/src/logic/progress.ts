/**
 * نوار «حس پیشرفت» — تعداد حروف یکتای کشف‌شده از جواب، بدون لو دادن جایگاه.
 * مبنا: شیب هدف (Hull 1932؛ Kivetz et al. 2006): هرچه به هدف نزدیک‌تر،
 * انگیزه‌ی ادامه بیشتر. فقط «چند حرف» را می‌گوییم، نه «کجا».
 */

import type { GuessEvaluation } from '@dordaneh/contracts';

export interface DiscoveryProgress {
  /** تعداد حروف یکتای جواب که کشف شده‌اند (correct یا present) */
  found: number;
  /** تعداد کل حروف یکتای جواب — تقریب امن: حداکثر wordLength */
  total: number;
  /** نسبت 0..1 برای عرض نوار */
  ratio: number;
}

/**
 * از آنجا که جواب را نمی‌دانیم (تا پایان بازی)، «حروف یکتای کشف‌شده» را از
 * وضعیت‌های correct/present حدس‌ها می‌شماریم. total = wordLength (سقف امن؛
 * اگر جواب حرف تکراری داشته باشد نوار فقط کمی محافظه‌کارتر است — هرگز اسپویل نمی‌کند).
 */
export function computeProgress(
  guesses: readonly GuessEvaluation[],
  wordLength: number,
): DiscoveryProgress {
  const discovered = new Set<string>();
  for (const g of guesses) {
    const chars = [...g.guess];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const st = g.states[i];
      if (ch !== undefined && (st === 'correct' || st === 'present')) discovered.add(ch);
    }
  }
  const total = Math.max(1, wordLength);
  const found = Math.min(discovered.size, total);
  return { found, total, ratio: found / total };
}
