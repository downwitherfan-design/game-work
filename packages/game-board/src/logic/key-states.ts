/**
 * محاسبه‌ی وضعیت رنگ هر کلید کیبورد از روی حدس‌های ارزیابی‌شده.
 * قانون اولویت: correct > present > absent (کلیدی که یک‌بار سبز شد، دیگر
 * هرگز تنزل نمی‌کند — همان الگوی ذهنی Wordle که کاربر می‌شناسد).
 */

import type { GuessEvaluation, LetterState } from '@dordaneh/contracts';

export type KeyState = Extract<LetterState, 'correct' | 'present' | 'absent'>;

const RANK: Readonly<Record<KeyState, number>> = { absent: 1, present: 2, correct: 3 };

/** نگاشت حرف → بهترین وضعیت شناخته‌شده تا این لحظه */
export function computeKeyStates(guesses: readonly GuessEvaluation[]): Map<string, KeyState> {
  const map = new Map<string, KeyState>();
  for (const g of guesses) {
    const chars = [...g.guess];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const st = g.states[i];
      if (ch === undefined) continue;
      if (st !== 'correct' && st !== 'present' && st !== 'absent') continue;
      const prev = map.get(ch);
      if (!prev || RANK[st] > RANK[prev]) map.set(ch, st);
    }
  }
  return map;
}
