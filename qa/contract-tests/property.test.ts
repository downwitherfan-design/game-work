/**
 * تست‌های خصوصیت‌محور (property-based) — الگوی QuickCheck
 * (Claessen & Hughes, ICFP 2000) روی normalizeFa و ارزیاب حدس.
 * هزاران ورودی تصادفی قطعی (seeded) — شکست‌ها با seed بازتولیدپذیرند.
 */

import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import { evaluateOracle, toChars } from '../src/oracle';
import { createRng, forAll, genFaWord, genInt, genMessyFa } from '../src/proptest';

const RUNS = 2000;

describe('property: normalizeFa', () => {
  it('idempotent — normalize(normalize(x)) === normalize(x)', () => {
    forAll(
      genMessyFa(0, 24),
      (s) => normalizeFa(normalizeFa(s)) === normalizeFa(s),
      { runs: RUNS },
    );
  });

  it('هرگز throw نمی‌کند و همیشه string برمی‌گرداند', () => {
    forAll(genMessyFa(0, 40), (s) => typeof normalizeFa(s) === 'string', { runs: RUNS });
  });

  it('خروجی هرگز ي/ك/ۀ/اعراب/ZWNJ ندارد', () => {
    const forbidden = /[\u064A\u0643\u06C0\u200C\u200D\u064B-\u065F\u0640]/u;
    forAll(genMessyFa(0, 30), (s) => !forbidden.test(normalizeFa(s)), { runs: RUNS });
  });

  it('طول خروجی ≤ طول ورودی (نرمال‌سازی چیزی اضافه نمی‌کند)', () => {
    forAll(
      genMessyFa(0, 30),
      (s) => toChars(normalizeFa(s)).length <= toChars(s).length,
      { runs: RUNS },
    );
  });

  it('روی رشته‌ی از-قبل-نرمالِ تمیز، این‌همانی است', () => {
    forAll(
      genInt(1, 12),
      (len) => {
        const rng = createRng(len * 7919);
        const w = genFaWord(len)(rng);
        return normalizeFa(w) === w;
      },
      { runs: 500 },
    );
  });
});

describe('property: evaluateOracle (ارزیاب حدس)', () => {
  interface Pair {
    solution: string;
    guess: string;
  }
  const genPair = (rng: () => number): Pair => {
    const len = genInt(3, 8)(rng);
    return { solution: genFaWord(len)(rng), guess: genFaWord(len)(rng) };
  };

  it('طول states === طول حدس (invariant قرارداد §1)', () => {
    forAll(
      genPair,
      ({ solution, guess }) =>
        evaluateOracle(solution, guess).length === toChars(guess).length,
      { runs: RUNS },
    );
  });

  it('states فقط شامل correct/present/absent است', () => {
    forAll(
      genPair,
      ({ solution, guess }) =>
        evaluateOracle(solution, guess).every((s) =>
          s === 'correct' || s === 'present' || s === 'absent',
        ),
      { runs: RUNS },
    );
  });

  it('حدسِ برابر با جواب → همه correct؛ و برعکس', () => {
    forAll(
      genInt(3, 8),
      (len) => {
        const rng = createRng(len * 104729);
        const w = genFaWord(len)(rng);
        return evaluateOracle(w, w).every((s) => s === 'correct');
      },
      { runs: 500 },
    );
  });

  it('پایستگی شمارش: برای هر حرف، correct+present ≤ تکرار آن حرف در جواب', () => {
    forAll(
      genPair,
      ({ solution, guess }) => {
        const states = evaluateOracle(solution, guess);
        const gChars = toChars(normalizeFa(guess));
        const solCount = new Map<string, number>();
        for (const c of toChars(normalizeFa(solution))) {
          solCount.set(c, (solCount.get(c) ?? 0) + 1);
        }
        const colored = new Map<string, number>();
        states.forEach((s, i) => {
          if (s === 'correct' || s === 'present') {
            const c = gChars[i] as string;
            colored.set(c, (colored.get(c) ?? 0) + 1);
          }
        });
        for (const [c, n] of colored) {
          if (n > (solCount.get(c) ?? 0)) return false;
        }
        return true;
      },
      { runs: RUNS },
    );
  });

  it('حرفِ سرجای درست همیشه correct است (هیچ گذری آن را نمی‌دزدد)', () => {
    forAll(
      genPair,
      ({ solution, guess }) => {
        const states = evaluateOracle(solution, guess);
        const sol = toChars(normalizeFa(solution));
        const gss = toChars(normalizeFa(guess));
        return gss.every((c, i) => c !== sol[i] || states[i] === 'correct');
      },
      { runs: RUNS },
    );
  });

  it('نسبت به آلودگی ورودی پایدار است: evaluate(messy) === evaluate(normalized)', () => {
    forAll(
      genPair,
      ({ solution, guess }) => {
        // تزریق ZWNJ و اعراب در میانه‌ی حدس
        const messy = toChars(guess).join('\u200C') + '\u064E';
        return (
          JSON.stringify(evaluateOracle(solution, messy)) ===
          JSON.stringify(evaluateOracle(solution, guess))
        );
      },
      { runs: 1000 },
    );
  });
});

describe('property: تست‌های نمونه‌ی مرجع حروف تکراری (جدول حقیقت دستی)', () => {
  const cases: { solution: string; guess: string; expected: string[] }[] = [
    // جابه‌جایی کامل: سبزِ وسط + دو کهربایی
    { solution: 'ااب', guess: 'باا', expected: ['present', 'correct', 'present'] },
    // حدس حرف تکراری بیش از موجودی جواب: فقط سبز، بقیه absent
    { solution: 'ابج', guess: 'ااا', expected: ['correct', 'absent', 'absent'] },
    // سبز موجودی را قبل از کهربایی مصرف می‌کند
    { solution: 'ابا', guess: 'اءا', expected: ['correct', 'absent', 'correct'] },
    // باگ کلاسیک Wordle: ب×۲ و ا×۲ در جواب؛ تکرارهای مازاد حدس absent می‌مانند
    { solution: 'باغبان', guess: 'بابابا', expected: ['correct', 'correct', 'present', 'present', 'absent', 'absent'] },
  ];
  for (const { solution, guess, expected } of cases) {
    it(`جواب=${solution} حدس=${guess}`, () => {
      expect(evaluateOracle(solution, guess)).toEqual(expected);
    });
  }
});
