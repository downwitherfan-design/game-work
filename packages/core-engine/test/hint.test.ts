/**
 * تست‌های راهنمای مبتنی بر آنتروپی (computeBestHint).
 */
import { describe, expect, it } from 'vitest';
import { computeBestHint } from '../src/hint';
import { createInitialState, applyGuess } from '../src/state-machine';
import { evaluateGuessAgainst } from '../src/evaluate-guess';
import type { PuzzleState } from '@dordaneh/contracts';

const T0 = 1;

function stateWithGuesses(solution: string, guesses: string[]): PuzzleState {
  let s = createInitialState('t', Array.from(solution).length, 6, T0);
  for (const g of guesses) {
    s = applyGuess(s, evaluateGuessAgainst(g, solution), solution, T0);
  }
  return s;
}

describe('computeBestHint', () => {
  it('بدون هیچ حدسی: جایگاهی معتبر از جواب برمی‌گرداند', () => {
    const s = stateWithGuesses('دردانه', []);
    const hint = computeBestHint(s, 'دردانه');
    expect(hint).not.toBeNull();
    expect(Array.from('دردانه')[hint!.position]).toBe(hint!.letter);
  });

  it('جایگاه‌های کشف‌شده (correct) هرگز پیشنهاد نمی‌شوند', () => {
    // حدس دندانه علیه دردانه → جایگاه‌های ۰و۲و۳و۴و۵ correct؛ فقط ۱ (ر) می‌ماند
    const s = stateWithGuesses('دردانه', ['دندانه']);
    const hint = computeBestHint(s, 'دردانه');
    expect(hint).toEqual({ letter: 'ر', position: 1 });
  });

  it('حرف کاملاً تازه بر حرفِ present-شده اولویت دارد (اطلاعات بیشتر)', () => {
    // جواب: سرزمین (س ر ز م ی ن) — حدس: مهربان
    // م present، ر present، ه/ب/ا absent، ن correct(۵)
    // کاندیدها: س(۰) تازه، ر(۱) known، ز(۲) تازه، م(۳) known، ی(۴) تازه
    const s = stateWithGuesses('سرزمین', ['مهربان']);
    const hint = computeBestHint(s, 'سرزمین');
    // باید یکی از حروف تازه (س/ز/ی) باشد نه ر/م
    expect(['س', 'ز', 'ی']).toContain(hint!.letter);
    // قطعیت: تساوی → کمترین ایندکس → س(۰)
    expect(hint).toEqual({ letter: 'س', position: 0 });
  });

  it('حرف present-شده بر حرف تکراریِ correct-شده اولویت دارد', () => {
    // جواب: دادگاه (د ا د گ ا ه) — حدس: دوستان
    // د(۰) correct؛ ا(۴)... دوستان = د و س ت ا ن → ا(۴) هم‌جا با ا(۴) جواب → correct
    // کاندیدها: ۱(ا: تکراری-correct→امتیاز۱−log2(2)=0)، ۲(د: تکراری-correct→1−1=0)،
    //           ۳(گ: تازه→3.5)، ۵(ه: تازه→3.5)
    const s = stateWithGuesses('دادگاه', ['دوستان']);
    const hint = computeBestHint(s, 'دادگاه');
    expect(hint).toEqual({ letter: 'گ', position: 3 }); // تازه، بدون تکرار، کمترین ایندکس
  });

  it('جریمه‌ی تکرار: حرف یکتا بر حرف پرتکرار جواب اولویت دارد', () => {
    // جواب: دارایی (د ا ر ا ی ی) — بدون حدس
    // امتیازها: د(۰)=3.5، ا=3.5−1=2.5، ر=3.5، ی=3.5−1=2.5
    // بیشینه‌ی نخست: د(۰)
    const s = stateWithGuesses('دارایی', []);
    const hint = computeBestHint(s, 'دارایی');
    expect(hint).toEqual({ letter: 'د', position: 0 });
  });

  it('حرفی که absent دیده شده ولی در واقع جای دیگر جواب است، بونس تازگی نمی‌گیرد', () => {
    // سناریوی حروف تکراری: کاربر «د» را دیده absent (چون سهمیه مصرف شده بود)
    // جواب: دردانه — حدس: ددددده → د(۰)د(۲) correct، بقیه د absent، ه(۵) correct
    // کاندیدها: ۱(ر تازه)، ۳(ا تازه)، ۴(ن تازه)
    const s = stateWithGuesses('دردانه', ['ددددده']);
    const hint = computeBestHint(s, 'دردانه');
    expect(['ر', 'ا', 'ن']).toContain(hint!.letter);
    expect(hint!.position).toBe(1); // تساوی امتیاز → کمترین ایندکس
  });

  it('همه‌ی جایگاه‌ها کشف‌شده → null', () => {
    // برد کامل (وضعیت won ولی تابع خالص فقط به discovered نگاه می‌کند)
    const s = stateWithGuesses('دردانه', ['دردانه']);
    expect(computeBestHint(s, 'دردانه')).toBeNull();
  });

  it('قطعیت: دو فراخوانی همان خروجی را می‌دهد', () => {
    const s = stateWithGuesses('گلستان', ['باستان']);
    expect(computeBestHint(s, 'گلستان')).toEqual(computeBestHint(s, 'گلستان'));
  });
});
