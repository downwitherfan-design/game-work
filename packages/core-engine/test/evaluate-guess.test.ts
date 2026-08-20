/**
 * تست‌های الگوریتم دو-گذری ارزیابی حدس.
 * تمرکز اصلی: مدیریت صحیح حروف تکراری (پرتکرارترین باگ کلون‌های Wordle).
 * ایندکس ۰ = نخستین حرف کلمه (در نمایش RTL، راست‌ترین).
 */
import { describe, expect, it } from 'vitest';
import { evaluateGuessAgainst, isWinningEvaluation } from '../src/evaluate-guess';
import type { LetterState } from '@dordaneh/contracts';

/** کمکی: ارزیابی و فقط آرایه‌ی حالت‌ها */
function states(guess: string, solution: string): LetterState[] {
  return evaluateGuessAgainst(guess, solution).states;
}

describe('evaluateGuessAgainst — پایه', () => {
  it('حدس کاملاً درست → همه correct', () => {
    expect(states('دردانه', 'دردانه')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('حدس بدون هیچ حرف مشترک → همه absent', () => {
    expect(states('کتاب', 'شمشی')).toEqual(['absent', 'absent', 'absent', 'absent']);
  });

  it('حروف هم‌جایگاه → correct و حروف غایب → absent', () => {
    // جواب: باغبان (ب ا غ ب ا ن) — حدس: باستان (ب ا س ت ا ن)
    expect(states('باستان', 'باغبان')).toEqual([
      'correct', // ب
      'correct', // ا
      'absent', // س — در جواب نیست
      'absent', // ت — در جواب نیست (ب باقیمانده ولی ت نیست)
      'correct', // ا
      'correct', // ن
    ]);
  });

  it('حرف موجود در جای غلط → present', () => {
    // جواب: سرزمین (س ر ز م ی ن) — حدس: مهربان (م ه ر ب ا ن)
    const result = states('مهربان', 'سرزمین');
    expect(result[0]).toBe('present'); // م — در جواب هست (جایگاه ۳)
    expect(result[2]).toBe('present'); // ر — در جواب هست (جایگاه ۱)
    expect(result[1]).toBe('absent'); // ه — در جواب نیست
    expect(result[5]).toBe('correct'); // ن
  });

  it('خروجی guess را عیناً برمی‌گرداند و states هم‌طول است', () => {
    const ev = evaluateGuessAgainst('کتابها', 'دردانه');
    expect(ev.guess).toBe('کتابها');
    expect(ev.states).toHaveLength(6);
  });

  it('طول نابرابر → throw (نقض پیش‌شرط)', () => {
    expect(() => evaluateGuessAgainst('کتاب', 'دردانه')).toThrow(/طول/);
  });
});

// ---------------------------------------------------------------------------
// 🎯 حروف تکراری — بلوک ۱۷ تستی (الزام مأموریت: حداقل ۱۵)
// ---------------------------------------------------------------------------
describe('evaluateGuessAgainst — حروف تکراری (الگوریتم دو-گذری)', () => {
  // ۱
  it('تکرار در حدس، یک وقوع در جواب که هم‌جاست: correct می‌گیرد و وقوع دیگر absent', () => {
    // جواب: پرستار — «ا» فقط جایگاه ۴. حدس: دادگاه — «ا» در ۱ و ۴.
    const result = states('دادگاه', 'پرستار');
    expect(result[4]).toBe('correct'); // ا هم‌جا
    expect(result[1]).toBe('absent'); // ا اضافی — سهمیه صفر
  });

  // ۲
  it('تکرار در حدس، یک وقوع در جواب بدون هم‌جایی: فقط اولین وقوع present', () => {
    // جواب: کبوترک — «و» یک بار (جایگاه ۲). حدس: نوروزی — «و» در ۱ و ۳.
    const result = states('نوروزی', 'کبوترک');
    expect(result[1]).toBe('present'); // اولین «و» سهمیه را می‌گیرد
    expect(result[3]).toBe('absent'); // دومین «و» — سهمیه تمام
  });

  // ۳
  it('یک وقوع correct + سهمیه‌ی باقیمانده برای وقوع دیگر → present', () => {
    // جواب: بارانی (ب ا ر ا ن ی) — «ا» در ۱ و ۳. حدس: دادگاه — «ا» در ۱ و ۴.
    const result = states('دادگاه', 'بارانی');
    expect(result[1]).toBe('correct'); // ا هم‌جا با جایگاه ۱
    expect(result[4]).toBe('present'); // ا دوم — سهمیه‌ی «ا» هنوز ۱ مانده
  });

  // ۴
  it('گذر اول سهمیه را قبل از اعطای present کم می‌کند (باگ کلاسیک کلون‌ها)', () => {
    // جواب: دندانه (د ن د ا ن ه) — «د» در ۰ و ۲. حدس: ددددده.
    expect(states('ددددده', 'دندانه')).toEqual([
      'correct', // د(۰) هم‌جا
      'absent', // سهمیه‌ی «د» توسط correct ها مصرف شد
      'correct', // د(۲) هم‌جا
      'absent',
      'absent',
      'correct', // ه(۵) هم‌جا
    ]);
  });

  // ۵
  it('دو وقوع در حدس، دو وقوع در جواب، بدون هم‌جایی → هر دو present', () => {
    // جواب: دادگاه — «د» در ۰ و ۲. حدس: هدهدها — «د» در ۱ و ۳.
    const result = states('هدهدها', 'دادگاه');
    expect(result[1]).toBe('present');
    expect(result[3]).toBe('present');
  });

  // ۶
  it('پنج وقوع در حدس، دو وقوع در جواب → دقیقاً دو علامت (هر دو correct)', () => {
    // جواب: دادگاه — «ا» در ۱ و ۴. حدس: ااااان.
    expect(states('ااااان', 'دادگاه')).toEqual([
      'absent',
      'correct', // ا(۱) هم‌جا
      'absent',
      'absent',
      'correct', // ا(۴) هم‌جا
      'absent', // ن — در جواب نیست
    ]);
  });

  // ۷
  it('حرف تکراری در حدس با یک وقوع در جواب: اولی present، دومی absent', () => {
    // جواب: دردانه — «ن» یک بار (جایگاه ۴). حدس: نگهبان — «ن» در ۰ و ۵.
    const result = states('نگهبان', 'دردانه');
    expect(result[0]).toBe('present'); // ن اول
    expect(result[5]).toBe('absent'); // ن دوم — سهمیه مصرف شد
  });

  // ۸
  it('حرف تکراری در جواب با یک وقوع در حدس → همان یک وقوع علامت می‌گیرد', () => {
    // جواب: کبوترک — «ک» در ۰ و ۵. حدس: بازیکن — «ک» یک بار (جایگاه ۴).
    const result = states('بازیکن', 'کبوترک');
    expect(result[4]).toBe('present');
  });

  // ۹
  it('ترکیب correct و absent برای حرف تکراری حدس در حضور correct های دیگر', () => {
    // جواب: دبستان (د ب س ت ا ن) — حدس: باستان (ب ا س ت ا ن)
    const result = states('باستان', 'دبستان');
    expect(result[2]).toBe('correct'); // س
    expect(result[3]).toBe('correct'); // ت
    expect(result[4]).toBe('correct'); // ا(۴) هم‌جا
    expect(result[1]).toBe('absent'); // ا(۱) — تنها «ا» جواب در گذر۱ مصرف شد
    expect(result[0]).toBe('present'); // ب — جواب «ب» در جایگاه ۱ دارد
    expect(result[5]).toBe('correct'); // ن
  });

  // ۱۰
  it('حدس با تکرار == جواب با همان تکرار → همه correct', () => {
    expect(states('داداشی', 'داداشی')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  // ۱۱
  it('تکرار سنگین دوطرفه: هدهدها در برابر دردانه', () => {
    // جواب: دردانه (د ر د ا ن ه) — حدس: هدهدها (ه د ه د ه ا)
    // سهمیه: د=۲، ه=۱، ا=۱ → ه(۰) present، د(۱) present، ه(۲) absent،
    // د(۳) present، ه(۴) absent، ا(۵) present
    expect(states('هدهدها', 'دردانه')).toEqual([
      'present',
      'present',
      'absent',
      'present',
      'absent',
      'present',
    ]);
  });

  // ۱۲
  it('correct های انتهایی، present های ابتدایی را نمی‌دزدند وقتی سهمیه کافی است', () => {
    // جواب: دارایی (د ا ر ا ی ی) «ا»×۲، «ی»×۲ — حدس: ایرانی (ا ی ر ا ن ی)
    expect(states('ایرانی', 'دارایی')).toEqual([
      'present', // ا(۰) — سهمیه‌ی «ا» پس از correct(۳) هنوز ۱ دارد
      'present', // ی(۱) — سهمیه‌ی «ی» پس از correct(۵) هنوز ۱ دارد
      'correct', // ر
      'correct', // ا
      'absent', // ن
      'correct', // ی
    ]);
  });

  // ۱۳
  it('پنج وقوع حدس، دو وقوع جواب که هر دو هم‌جا → دو correct + بقیه absent + حرف دیگر present', () => {
    // جواب: نانوای (ن ا ن و ا ی) — حدس: ااااان
    expect(states('ااااان', 'نانوای')).toEqual([
      'absent',
      'correct', // ا(۱)
      'absent',
      'absent',
      'correct', // ا(۴)
      'present', // ن — جواب دو «ن» دارد و هیچ‌کدام مصرف نشده
    ]);
  });

  // ۱۴
  it('جواب با سه وقوع، حدس با سه وقوع (یکی هم‌جا) → correct + دو present', () => {
    // جواب: ددداکب (د د د ا ک ب) — حدس: کدبددا (ک د ب د د ا)
    expect(states('کدبددا', 'ددداکب')).toEqual([
      'present', // ک
      'correct', // د(۱) هم‌جا
      'present', // ب
      'present', // د — سهمیه‌ی «د» = ۲
      'present', // د — سهمیه‌ی «د» = ۱
      'present', // ا
    ]);
  });

  // ۱۵ — تست خاصیت (property test)
  it('انولاریانت: تعداد علامت‌های (correct+present) هر حرف ≤ وقوعش در جواب', () => {
    const pairs: Array<[string, string]> = [
      ['ددددده', 'دردانه'],
      ['ااااان', 'باغبان'],
      ['هدهدها', 'دادگاه'],
      ['داداشی', 'دردانه'],
      ['نانوای', 'دوستان'],
      ['دارایی', 'ایرانی'],
      ['کدبددا', 'ددداکب'],
    ];
    for (const [guess, solution] of pairs) {
      const result = evaluateGuessAgainst(guess, solution);
      const guessChars = Array.from(guess);
      const solutionChars = Array.from(solution);
      for (const letter of new Set(guessChars)) {
        const inSolution = solutionChars.filter((c) => c === letter).length;
        const marked = guessChars.filter(
          (c, i) => c === letter && result.states[i] !== 'absent',
        ).length;
        expect(marked, `حرف «${letter}» در ${guess}/${solution}`).toBeLessThanOrEqual(inSolution);
      }
    }
  });

  // ۱۶
  it('correct هرگز قربانی present نمی‌شود (تقدم مطلق گذر اول)', () => {
    // جواب: دردانه — حدس: دندانه → «ن» اضافی absent چون «ن» جواب در correct(۴) مصرف شد
    expect(states('دندانه', 'دردانه')).toEqual([
      'correct',
      'absent', // ن(۱) — سهمیه‌ی «ن» توسط correct(۴) مصرف شد
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  // ۱۷
  it('عدم تقارن: جابه‌جایی حدس و جواب نتیجه‌ی متفاوت می‌دهد', () => {
    const a = states('نوروزی', 'کبوترک');
    const b = states('کبوترک', 'نوروزی');
    expect(a).not.toEqual(b);
  });
});

describe('isWinningEvaluation', () => {
  it('همه correct → true', () => {
    expect(isWinningEvaluation(evaluateGuessAgainst('دردانه', 'دردانه'))).toBe(true);
  });
  it('حتی یک غیر-correct → false', () => {
    expect(isWinningEvaluation(evaluateGuessAgainst('دندانه', 'دردانه'))).toBe(false);
  });
  it('آرایه‌ی خالی → false (محافظ حدی)', () => {
    expect(isWinningEvaluation({ guess: '', states: [] })).toBe(false);
  });
});
