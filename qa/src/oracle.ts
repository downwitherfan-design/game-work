/**
 * @dordaneh/qa — «اوراکل» ارزیابی حدس (مرجع مستقل برای صحت‌سنجی هر پیاده‌سازی EngineApi).
 *
 * الگوریتم استاندارد دو-گذره‌ی Wordle برای حروف تکراری:
 *  گذر ۱: همه‌ی حروفِ سرجای درست → 'correct' و از شمارنده‌ی جواب کم می‌شوند.
 *  گذر ۲: از چپ به راست، اگر حرف هنوز در شمارنده باقی است → 'present'، وگرنه 'absent'.
 *
 * این پیاده‌سازی فقط برای تست است و هرگز به production نمی‌رود؛
 * پیاده‌سازی واقعی مال AI-01 (packages/core-engine) است.
 * نرمال‌سازی فقط از @dordaneh/contracts (خط قرمز ۲۱).
 */

import { normalizeFa, type LetterState } from '@dordaneh/contracts';

/** تجزیه‌ی رشته‌ی نرمال به آرایه‌ی code pointها (ایمن در برابر surrogate pair) */
export function toChars(s: string): string[] {
  return Array.from(s);
}

/**
 * ارزیابی مرجع حدس در برابر جواب — هر دو ورودی پیش از مقایسه نرمال می‌شوند.
 * خروجی هم‌طول با حدس (پس از نرمال‌سازی).
 */
export function evaluateOracle(solution: string, guess: string): LetterState[] {
  const sol = toChars(normalizeFa(solution));
  const gss = toChars(normalizeFa(guess));

  const states: LetterState[] = new Array<LetterState>(gss.length).fill('absent');
  const remaining = new Map<string, number>();

  // گذر ۱ — سبزها
  for (let i = 0; i < gss.length; i++) {
    const g = gss[i] as string;
    const s = sol[i];
    if (s !== undefined && g === s) {
      states[i] = 'correct';
    } else if (s !== undefined) {
      remaining.set(s, (remaining.get(s) ?? 0) + 1);
    }
  }
  // حروف جواب که خارج از محدوده‌ی حدس‌اند هم باید شمارش شوند (طول نابرابر)
  for (let i = gss.length; i < sol.length; i++) {
    const s = sol[i] as string;
    remaining.set(s, (remaining.get(s) ?? 0) + 1);
  }

  // گذر ۲ — کهربایی‌ها از چپ به راست
  for (let i = 0; i < gss.length; i++) {
    if (states[i] === 'correct') continue;
    const g = gss[i] as string;
    const left = remaining.get(g) ?? 0;
    if (left > 0) {
      states[i] = 'present';
      remaining.set(g, left - 1);
    }
  }
  return states;
}
