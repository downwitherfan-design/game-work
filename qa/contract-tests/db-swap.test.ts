/**
 * «تست تعویض دیتابیس» — ضامن هدف راهبردی صادرات (MASTER_PLAN ستون ۴):
 * موتور بازی باید بدون هیچ تغییری با یک WordDbApi انگلیسی ۵ حرفی کار کند.
 * اگر این تست بشکند، جداسازی موتور/محتوا نقض شده و صادرات با «تعویض دیتابیس»
 * دیگر ممکن نیست — شدت S2.
 */

import { describe, expect, it } from 'vitest';
import type { GuessEvaluation } from '@dordaneh/contracts';
import { createMockEngine } from '../src/mocks/engine.mock';
import { createMockWordDbEnglish, MOCK_ANSWERS_EN_5 } from '../src/mocks/word-db.mock';
import { evaluateOracle } from '../src/oracle';

function ok(r: GuessEvaluation | { error: string }): r is GuessEvaluation {
  return !('error' in r);
}

describe('DB-swap: موتور بدون تغییر + word-db انگلیسی ۵ حرفی', () => {
  const answerFor = (n: number): string =>
    MOCK_ANSWERS_EN_5[
      ((n % MOCK_ANSWERS_EN_5.length) + MOCK_ANSWERS_EN_5.length) % MOCK_ANSWERS_EN_5.length
    ] as string;

  it('معمای روزانه با دیتابیس انگلیسی wordLength=5 می‌دهد', () => {
    const engine = createMockEngine(createMockWordDbEnglish());
    const p = engine.getDailyPuzzle(42);
    expect(p.puzzleId).toBe('daily-42');
    expect(p.wordLength).toBe(5);
  });

  it('قطعیت با دیتابیس تعویض‌شده حفظ می‌شود', () => {
    const a = createMockEngine(createMockWordDbEnglish()).getDailyPuzzle(42);
    const b = createMockEngine(createMockWordDbEnglish()).getDailyPuzzle(42);
    expect(a).toEqual(b);
  });

  it('چرخه‌ی کامل برد به انگلیسی: حدس معتبر → رنگ‌بندی درست → won', () => {
    const engine = createMockEngine(createMockWordDbEnglish());
    const { puzzleId } = engine.getDailyPuzzle(42);
    const answer = answerFor(42);

    // یک حدس معتبرِ غیرجواب
    const probe = MOCK_ANSWERS_EN_5.find((w) => w !== answer) as string;
    const r1 = engine.evaluateGuess(puzzleId, probe);
    expect(ok(r1)).toBe(true);
    if (ok(r1)) expect(r1.states).toEqual(evaluateOracle(answer, probe));

    // حدس جواب → برد
    const r2 = engine.evaluateGuess(puzzleId, answer);
    expect(ok(r2)).toBe(true);
    if (ok(r2)) expect(r2.states.every((s) => s === 'correct')).toBe(true);
    expect(engine.getState(puzzleId).status).toBe('won');
  });

  it('مرزها به انگلیسی هم کار می‌کنند: WRONG_LENGTH و INVALID_WORD', () => {
    const engine = createMockEngine(createMockWordDbEnglish());
    const { puzzleId } = engine.getDailyPuzzle(1);
    expect(engine.evaluateGuess(puzzleId, 'cat')).toEqual({ error: 'WRONG_LENGTH' });
    expect(engine.evaluateGuess(puzzleId, 'zzzzz')).toEqual({ error: 'INVALID_WORD' });
  });

  it('حروف تکراری لاتین هم با اوراکل دو-گذره درست رنگ می‌شوند', () => {
    // solution 'eerie' (e×3)، guess 'lever' (e×2)
    expect(evaluateOracle('eerie', 'lever')).toEqual([
      'absent', // l
      'correct', // e
      'absent', // v
      'present', // e (هنوز e در موجودی هست)
      'present', // r
    ]);
  });
});
