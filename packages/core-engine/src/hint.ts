/**
 * راهنمای هوشمند — انتخاب حرفی که «بیشترین کاهش فضای جواب» را می‌دهد.
 *
 * اکتشافی مبتنی بر آنتروپی ساده:
 * بدون دسترسی به کل واژه‌نامه (word-db فقط isValidWord می‌دهد، نه فهرست)،
 * فضای جواب را با «عدم قطعیت کاربر درباره‌ی هر جایگاه» مدل می‌کنیم:
 *
 * ۱. جایگاه‌های هنوز-کشف‌نشده (بدون correct در حدس‌های قبلی) کاندید هستند.
 * ۲. برای هر جایگاه کاندید، امتیاز اطلاعاتی حرفِ جواب در آن جایگاه:
 *    - حرفی که هنوز هیچ بازخوردی درباره‌اش نیامده (نه present نه absent)
 *      بیشترین اطلاعات تازه را دارد → امتیاز پایه ۳.
 *    - حرفی که کاربر می‌داند در کلمه هست (present) اما جایش را نمی‌داند
 *      → فاش‌کردن جایگاهش هنوز مفید است → امتیاز پایه ۲.
 *    - جایگاهی که حرفش در جایگاه دیگری correct شده (حرف تکراری)
 *      → کمترین اطلاعات → امتیاز پایه ۱.
 *    - جریمه‌ی تکرار: حرفی که در جایگاه‌های کاندیدِ دیگر هم ظاهر می‌شود،
 *      per-occurrence اطلاعات کمتری می‌دهد (کاهش لگاریتمی ساده).
 * ۳. بیشینه‌ی امتیاز انتخاب می‌شود؛ تساوی → کمترین ایندکس (قطعیت کامل).
 *
 * این معادلِ گسسته‌ی «بیشینه‌سازی کاهش آنتروپی مورد انتظار» است وقتی توزیع
 * فضای جواب یکنواخت فرض شود — توضیح کامل در README پکیج.
 */
import type { PersianChar, PuzzleState } from '@dordaneh/contracts';

export interface HintResult {
  letter: PersianChar;
  position: number;
}

export function computeBestHint(state: PuzzleState, solution: string): HintResult | null {
  const solutionChars = Array.from(solution);

  // جایگاه‌هایی که قبلاً correct شده‌اند، کشف‌شده محسوب می‌شوند
  const discovered = new Set<number>();
  // حروفی که کاربر «می‌داند در کلمه هستند» (correct یا present دیده)
  const knownInWord = new Set<string>();
  // حروفی که کاربر بازخورد absent برایشان دیده
  const seenAbsent = new Set<string>();

  for (const g of state.guesses) {
    const chars = Array.from(g.guess);
    for (let i = 0; i < g.states.length; i++) {
      const st = g.states[i];
      const ch = chars[i] as string;
      if (st === 'correct') {
        discovered.add(i);
        knownInWord.add(ch);
      } else if (st === 'present') {
        knownInWord.add(ch);
      } else if (st === 'absent') {
        seenAbsent.add(ch);
      }
    }
  }

  // حروف correct‌شده (برای جریمه‌ی حروف تکراری)
  const correctLetters = new Set<string>();
  for (const i of discovered) correctLetters.add(solutionChars[i] as string);

  let best: HintResult | null = null;
  let bestScore = -Infinity;

  for (let pos = 0; pos < solutionChars.length; pos++) {
    if (discovered.has(pos)) continue; // کشف‌شده — راهنما بی‌فایده
    const letter = solutionChars[pos] as string;

    let score: number;
    if (correctLetters.has(letter)) {
      score = 1; // حرف تکراری که جایگاه دیگرش سبز شده
    } else if (knownInWord.has(letter)) {
      score = 2; // کاربر می‌داند هست؛ جایگاه را فاش می‌کنیم
    } else {
      score = 3; // حرف کاملاً تازه — بیشترین اطلاعات
    }

    // حرف کاملاً ناشناخته (حتی absent هم دیده نشده) کمی ارزشمندتر است
    if (!seenAbsent.has(letter) && !knownInWord.has(letter)) score += 0.5;

    // جریمه‌ی تکرار درون جواب: هر وقوع اضافی، اطلاعات per-hint را کم می‌کند
    const occurrences = solutionChars.filter((c) => c === letter).length;
    score -= Math.log2(occurrences); // occurrences=1 → 0 جریمه

    if (score > bestScore) {
      bestScore = score;
      best = { letter, position: pos };
    }
  }

  return best;
}
