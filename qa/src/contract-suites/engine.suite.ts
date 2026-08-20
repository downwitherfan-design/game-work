/**
 * @dordaneh/qa — suite قرارداد EngineApi (docs/02_CONTRACTS.md §1)
 * الگوی Consumer-Driven Contract Testing: این suite روی «هر» پیاده‌سازی
 * EngineApi اجرا می‌شود — امروز mock مرجع، فردا @dordaneh/core-engine واقعی.
 */

import { describe, expect, it } from 'vitest';
import { normalizeFa, type EngineApi, type GuessEvaluation } from '@dordaneh/contracts';
import { evaluateOracle, toChars } from '../oracle';

export interface EngineSuiteFixture {
  /** پیاده‌سازی تازه برای هر تست — بدون state مشترک */
  makeEngine: () => EngineApi;
  /** جواب مورد انتظار معمای روزانه‌ی شماره‌ی n (از دیتابیس همان فیکسچر) */
  answerFor: (puzzleNumber: number) => string;
  /** یک واژه‌ی معتبر ۶ حرفی که جوابِ معمای آزمایشی نیست */
  validNonAnswer: string;
  /** رشته‌ی ۶ نویسه‌ای که واژه‌ی معتبر نیست */
  invalidWord: string;
}

function isError(
  r: GuessEvaluation | { error: string },
): r is { error: 'INVALID_WORD' | 'WRONG_LENGTH' } {
  return 'error' in r;
}

export function runEngineContractSuite(name: string, fx: EngineSuiteFixture): void {
  describe(`EngineApi contract — ${name}`, () => {
    // ── قطعیت ─────────────────────────────────────────────────────────────
    it('getDailyPuzzle(812) روی ۱۰۰ اجرا (و ۱۰۰ نمونه‌ی تازه) خروجی یکسان می‌دهد', () => {
      const first = fx.makeEngine().getDailyPuzzle(812);
      for (let i = 0; i < 100; i++) {
        const engine = fx.makeEngine();
        expect(engine.getDailyPuzzle(812)).toEqual(first);
        // فراخوانی مجدد روی همان نمونه هم قطعی است
        expect(engine.getDailyPuzzle(812)).toEqual(first);
      }
    });

    it('puzzleId روزانه فرمت daily-<n> دارد و wordLength=6 (MVP)', () => {
      const p = fx.makeEngine().getDailyPuzzle(812);
      expect(p.puzzleId).toBe('daily-812');
      expect(p.wordLength).toBe(6);
    });

    it('getPracticePuzzle با seed یکسان قطعی است', () => {
      const a = fx.makeEngine().getPracticePuzzle(3, 42);
      const b = fx.makeEngine().getPracticePuzzle(3, 42);
      expect(a).toEqual(b);
    });

    it('getOnboardingPuzzle قطعی است (پیروزی ۳۰ثانیه‌ای باید برای همه یکسان باشد)', () => {
      const a = fx.makeEngine().getOnboardingPuzzle();
      const b = fx.makeEngine().getOnboardingPuzzle();
      expect(a).toEqual(b);
    });

    // ── مرزها ─────────────────────────────────────────────────────────────
    it('حدس کوتاه‌تر/بلندتر → WRONG_LENGTH (بدون ثبت در state)', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      for (const bad of ['کتاب', 'کتابخانه', '']) {
        const r = engine.evaluateGuess(puzzleId, bad);
        expect(r).toEqual({ error: 'WRONG_LENGTH' });
      }
      expect(engine.getState(puzzleId).guesses).toHaveLength(0);
    });

    it('واژه‌ی نامعتبر هم‌طول → INVALID_WORD (بدون سوختن حدس)', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      const r = engine.evaluateGuess(puzzleId, fx.invalidWord);
      expect(r).toEqual({ error: 'INVALID_WORD' });
      expect(engine.getState(puzzleId).guesses).toHaveLength(0);
    });

    it('حدس با نویسه‌های عربی (ي/ك) پس از نرمال‌سازی پذیرفته می‌شود — خط قرمز ۲۱', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      const answer = fx.answerFor(812);
      // آلوده‌کردن جواب با معادل‌های عربی
      const messy = answer.replace(/ی/g, '\u064A').replace(/ک/g, '\u0643');
      const r = engine.evaluateGuess(puzzleId, messy);
      expect(isError(r)).toBe(false);
      if (!isError(r)) {
        expect(r.guess).toBe(normalizeFa(answer));
        expect(r.states.every((s) => s === 'correct')).toBe(true);
      }
    });

    // ── صحت رنگ‌بندی (اوراکل مستقل) ──────────────────────────────────────
    it('رنگ‌بندی هر حدس معتبر با اوراکل دو-گذره‌ی مرجع یکی است', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      const answer = fx.answerFor(812);
      const r = engine.evaluateGuess(puzzleId, fx.validNonAnswer);
      expect(isError(r)).toBe(false);
      if (!isError(r)) {
        expect(r.states).toEqual(evaluateOracle(answer, fx.validNonAnswer));
        expect(r.states).toHaveLength(toChars(r.guess).length);
      }
    });

    it('حروف تکراری: حرف تکراریِ حدس بیش از موجودی جواب، present نمی‌گیرد (باگ کلاسیک Wordle)', () => {
      // مستقل از دیتابیس: اوراکل را روی حالت‌های سخت می‌سنجیم و قرارداد این است
      // که پیاده‌سازی موتور باید با اوراکل هم‌نظر باشد (تست بالا اتصال را برقرار می‌کند).
      // جواب «باغبان»: ب×۲، ا×۲. حدس «بابابا» (ب×۳، ا×۳):
      const states = evaluateOracle('باغبان', 'بابابا');
      // pos0 ب=ب correct؛ pos1 ا=ا correct؛ بقیه طبق موجودی
      expect(states[0]).toBe('correct');
      expect(states[1]).toBe('correct');
      const presentCountB = states.filter((s, i) => 'بابابا'[i] === 'ب' && s === 'present').length;
      const correctB = states.filter((s, i) => 'بابابا'[i] === 'ب' && s === 'correct').length;
      // ب در جواب ۲ بار است → مجموع correct+present برای ب ≤ ۲
      expect(correctB + presentCountB).toBeLessThanOrEqual(2);
      // و هرگز همه‌ی تکرارها رنگی نمی‌شوند
      expect(states.filter((s) => s === 'absent').length).toBeGreaterThan(0);
    });

    it('برد: state → won، solution پر، finishedAt ثبت می‌شود', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      const answer = fx.answerFor(812);
      const r = engine.evaluateGuess(puzzleId, answer);
      expect(isError(r)).toBe(false);
      const state = engine.getState(puzzleId);
      expect(state.status).toBe('won');
      expect(state.solution).toBe(normalizeFa(answer));
      expect(state.finishedAt).toBeTypeOf('number');
    });

    it('باخت پس از ۶ حدس اشتباه: status=lost و solution فاش می‌شود', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      for (let i = 0; i < 6; i++) {
        const r = engine.evaluateGuess(puzzleId, fx.validNonAnswer);
        expect(isError(r)).toBe(false);
      }
      const state = engine.getState(puzzleId);
      expect(state.status).toBe('lost');
      expect(state.guesses).toHaveLength(6);
      expect(state.solution).toBe(normalizeFa(fx.answerFor(812)));
    });

    it('solution قبل از پایان بازی هرگز در state فاش نمی‌شود (ضد اسپویل/تقلب)', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      engine.evaluateGuess(puzzleId, fx.validNonAnswer);
      const state = engine.getState(puzzleId);
      expect(state.status).toBe('playing');
      expect(state.solution).toBeUndefined();
    });

    it('getHint حرف/موقعیت درست از جواب می‌دهد و hintsUsed را بالا می‌برد', () => {
      const engine = fx.makeEngine();
      const { puzzleId } = engine.getDailyPuzzle(812);
      const hint = engine.getHint(puzzleId);
      expect(hint).not.toBeNull();
      if (hint) {
        const solChars = toChars(normalizeFa(fx.answerFor(812)));
        expect(solChars[hint.position]).toBe(hint.letter);
        expect(engine.getState(puzzleId).hintsUsed).toBeGreaterThanOrEqual(1);
      }
    });
  });
}
