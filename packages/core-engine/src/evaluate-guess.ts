/**
 * الگوریتم ارزیابی حدس — دو-گذری استاندارد Wordle با مدیریت صحیح حروف تکراری.
 *
 * گذر ۱: همه‌ی جایگاه‌های «درست» (correct) را علامت بزن و از شمارنده‌ی هر حرفِ
 *        جواب کم کن.
 * گذر ۲: برای جایگاه‌های باقیمانده، «present» فقط تا سقف باقیمانده‌ی شمارنده
 *        اعطا می‌شود؛ مازاد → «absent».
 *
 * این ترتیب تضمین می‌کند حرف تکراری در حدس هرگز بیش از تعداد وقوعش در جواب،
 * رنگ سبز/کهربایی نگیرد (پرتکرارترین باگ کلون‌های Wordle).
 *
 * تابع کاملاً خالص و قطعی است: بدون DOM، بدون شبکه، بدون side effect.
 * ورودی‌ها باید از قبل با normalizeFa قرارداد نرمال شده باشند.
 */
import type { GuessEvaluation, LetterState } from '@dordaneh/contracts';

export function evaluateGuessAgainst(guess: string, solution: string): GuessEvaluation {
  const guessChars = Array.from(guess);
  const solutionChars = Array.from(solution);

  if (guessChars.length !== solutionChars.length) {
    throw new Error(
      `evaluateGuessAgainst: طول حدس (${guessChars.length}) با طول جواب (${solutionChars.length}) برابر نیست`,
    );
  }

  const states: LetterState[] = new Array<LetterState>(guessChars.length).fill('absent');

  // شمارنده‌ی وقوع هر حرف در جواب (فقط برای جایگاه‌های غیر-correct)
  const remaining = new Map<string, number>();

  // --- گذر ۱: correct ها ---
  for (let i = 0; i < guessChars.length; i++) {
    const g = guessChars[i] as string;
    const s = solutionChars[i] as string;
    if (g === s) {
      states[i] = 'correct';
    } else {
      remaining.set(s, (remaining.get(s) ?? 0) + 1);
    }
  }

  // --- گذر ۲: present ها فقط تا سقف شمارنده‌ی باقیمانده ---
  for (let i = 0; i < guessChars.length; i++) {
    if (states[i] === 'correct') continue;
    const g = guessChars[i] as string;
    const count = remaining.get(g) ?? 0;
    if (count > 0) {
      states[i] = 'present';
      remaining.set(g, count - 1);
    }
    // در غیر این صورت absent باقی می‌ماند
  }

  return { guess, states };
}

/** آیا همه‌ی جایگاه‌ها correct هستند؟ (پیروزی) */
export function isWinningEvaluation(evaluation: GuessEvaluation): boolean {
  return evaluation.states.length > 0 && evaluation.states.every((s) => s === 'correct');
}
