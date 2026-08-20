/**
 * تست‌های یکپارچه‌ی موتور (EngineApi) با mock تزریقی word-db (۳۰ کلمه).
 * قطعیت، اعتبارسنجی، نرمال‌سازی فارسی، چرخه‌ی کامل بازی.
 */
import { describe, expect, it } from 'vitest';
import { createEngine, DAILY_WORD_LENGTH, MAX_GUESSES, ONBOARDING_PUZZLE_ID } from '../src/engine';
import { EngineError } from '../src/state-machine';
import { ANSWERS_6, createMockWordDb } from './fixtures/mock-word-db';

const T0 = 1_760_000_000_000;

function makeEngine(): ReturnType<typeof createEngine> {
  let t = T0;
  return createEngine({ wordDb: createMockWordDb(), now: () => t++ });
}

/** جواب مورد انتظار mock برای شماره‌ی معما */
function expectedAnswer(puzzleNumber: number): string {
  return ANSWERS_6[puzzleNumber % ANSWERS_6.length] as string;
}

describe('getDailyPuzzle — قطعیت', () => {
  it('شناسه‌ی daily-<n> و طول ۶ برمی‌گرداند', () => {
    const engine = makeEngine();
    expect(engine.getDailyPuzzle(812)).toEqual({ puzzleId: 'daily-812', wordLength: 6 });
  });

  it('قطعیت بین نمونه‌ها: getDailyPuzzle(812) روی دو موتور مستقل همان جواب را دارد', () => {
    // جواب را با بردن هر دو موتور با کلمه‌ی درست، راستی‌آزمایی می‌کنیم
    const answer = expectedAnswer(812);
    for (const engine of [makeEngine(), makeEngine()]) {
      const { puzzleId } = engine.getDailyPuzzle(812);
      const result = engine.evaluateGuess(puzzleId, answer);
      expect('states' in result && result.states.every((s) => s === 'correct')).toBe(true);
      expect(engine.getState(puzzleId).status).toBe('won');
      expect(engine.getState(puzzleId).solution).toBe(answer);
    }
  });

  it('فراخوانی تکراری همان معما را برمی‌گرداند و پیشرفت را صفر نمی‌کند', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(10);
    engine.evaluateGuess(puzzleId, 'کتابها');
    engine.getDailyPuzzle(10); // دوباره
    expect(engine.getState(puzzleId).guesses).toHaveLength(1);
  });

  it('DI: جواب از word-db.getAnswer تزریقی می‌آید', () => {
    const db = createMockWordDb();
    const engine = createEngine({ wordDb: db });
    engine.getDailyPuzzle(5);
    expect(db.calls.some((c) => c.method === 'getAnswer' && c.args[0] === 5)).toBe(true);
    expect(db.calls[0]?.args[1]).toBe(DAILY_WORD_LENGTH);
  });
});

describe('evaluateGuess — اعتبارسنجی', () => {
  it('طول غلط → WRONG_LENGTH (بدون ثبت حدس)', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(1);
    expect(engine.evaluateGuess(puzzleId, 'کتاب')).toEqual({ error: 'WRONG_LENGTH' });
    expect(engine.getState(puzzleId).guesses).toHaveLength(0);
  });

  it('کلمه‌ی خارج از واژه‌نامه → INVALID_WORD (بدون ثبت حدس)', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(1);
    expect(engine.evaluateGuess(puzzleId, 'ژژژژژژ')).toEqual({ error: 'INVALID_WORD' });
    expect(engine.getState(puzzleId).guesses).toHaveLength(0);
  });

  it('اعتبارسنجی روی متن نرمال‌شده انجام می‌شود (isValidWord ورودی نرمال می‌گیرد)', () => {
    const db = createMockWordDb();
    const engine = createEngine({ wordDb: db });
    const { puzzleId } = engine.getDailyPuzzle(1);
    engine.evaluateGuess(puzzleId, 'كتابها'); // با ك عربی
    const call = db.calls.find((c) => c.method === 'isValidWord');
    expect(call?.args[0]).toBe('کتابها'); // نرمال‌شده رسیده
  });

  it('⛔ puzzleId ناشناخته → EngineError(UNKNOWN_PUZZLE)', () => {
    const engine = makeEngine();
    expect(() => engine.evaluateGuess('daily-999', 'کتابها')).toThrowError(EngineError);
    expect(() => engine.getState('نامعلوم')).toThrowError(EngineError);
    expect(() => engine.getHint('نامعلوم')).toThrowError(EngineError);
  });

  it('⛔ حدس پس از پایان بازی → EngineError(GAME_OVER)', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(812);
    engine.evaluateGuess(puzzleId, expectedAnswer(812)); // برد
    expect(() => engine.evaluateGuess(puzzleId, 'کتابها')).toThrowError(EngineError);
  });
});

describe('چرخه‌ی کامل بازی', () => {
  it('باخت پس از ۶ حدس غلط + فاش‌شدن جواب فقط در پایان', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(0); // جواب: دردانه
    const wrong = ['کتابها', 'گلدسته', 'ایرانی', 'باغبان', 'دلاوری', 'سرزمین'];
    for (let i = 0; i < MAX_GUESSES; i++) {
      expect(engine.getState(puzzleId).solution).toBeUndefined();
      const r = engine.evaluateGuess(puzzleId, wrong[i] as string);
      expect('states' in r).toBe(true);
    }
    const final = engine.getState(puzzleId);
    expect(final.status).toBe('lost');
    expect(final.solution).toBe('دردانه');
    expect(final.finishedAt).toBeGreaterThanOrEqual(T0);
  });

  it('getState کپی دفاعی برمی‌گرداند (جهش بیرونی بی‌اثر است)', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(1); // جواب: کتابها
    engine.evaluateGuess(puzzleId, 'گلدسته'); // حدس غلطِ معتبر
    const s = engine.getState(puzzleId);
    s.guesses.pop();
    s.status = 'won';
    const again = engine.getState(puzzleId);
    expect(again.guesses).toHaveLength(1);
    expect(again.status).toBe('playing');
  });
});

describe('getPracticePuzzle — دشواری پویا', () => {
  it('دشواری ۱ → کلمه‌ی ۴ حرفی، دشواری ۵ → ۷ حرفی (طبق پروفایل Flow)', () => {
    const engine = makeEngine();
    expect(engine.getPracticePuzzle(1, 42).wordLength).toBe(4);
    expect(engine.getPracticePuzzle(5, 42).wordLength).toBe(7);
  });

  it('قطعیت: seed و دشواری یکسان → همان معما', () => {
    const a = makeEngine().getPracticePuzzle(3, 123);
    const b = makeEngine().getPracticePuzzle(3, 123);
    expect(a).toEqual(b);
  });

  it('seed های متفاوت → شناسه‌های متفاوت', () => {
    const engine = makeEngine();
    const a = engine.getPracticePuzzle(3, 1);
    const b = engine.getPracticePuzzle(3, 2);
    expect(a.puzzleId).not.toBe(b.puzzleId);
  });

  it('دشواری خارج از بازه clamp می‌شود (۰→۱، ۹→۵)', () => {
    const engine = makeEngine();
    expect(engine.getPracticePuzzle(0, 7).wordLength).toBe(4); // مثل دشواری ۱
    expect(engine.getPracticePuzzle(9, 7).wordLength).toBe(7); // مثل دشواری ۵
  });

  it('seed پیش‌فرض (بدون آرگومان) کار می‌کند و قطعی است', () => {
    const a = makeEngine().getPracticePuzzle(2);
    const b = makeEngine().getPracticePuzzle(2);
    expect(a).toEqual(b);
  });
});

describe('getOnboardingPuzzle — پیروزی ۳۰ ثانیه‌ای', () => {
  it('شناسه‌ی ثابت آنبوردینگ + کلمه‌ی آسان (دشواری ۱ = ۴ حرفی پرکاربرد)', () => {
    const engine = makeEngine();
    const p = engine.getOnboardingPuzzle();
    expect(p.puzzleId).toBe(ONBOARDING_PUZZLE_ID);
    expect(p.wordLength).toBe(4);
  });

  it('برای همه‌ی کاربران یکسان است (seed ثابت ۰، دشواری ۱)', () => {
    const db = createMockWordDb();
    const engine = createEngine({ wordDb: db });
    engine.getOnboardingPuzzle();
    const call = db.calls.find((c) => c.method === 'getPracticeAnswer');
    expect(call?.args).toEqual([0, 1]);
  });

  it('قابل بازی تا برد است', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getOnboardingPuzzle();
    const result = engine.evaluateGuess(puzzleId, 'کتاب'); // seed 0 → pool[0] = کتاب
    expect('states' in result && result.states.every((s) => s === 'correct')).toBe(true);
    expect(engine.getState(puzzleId).status).toBe('won');
  });
});

describe('getHint از مسیر موتور', () => {
  it('راهنما برمی‌گرداند و hintsUsed را زیاد می‌کند', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(0); // دردانه
    const hint = engine.getHint(puzzleId);
    expect(hint).not.toBeNull();
    expect(hint!.position).toBeGreaterThanOrEqual(0);
    expect(hint!.position).toBeLessThan(6);
    expect(Array.from('دردانه')[hint!.position]).toBe(hint!.letter);
    expect(engine.getState(puzzleId).hintsUsed).toBe(1);
  });

  it('پس از پایان بازی → null و hintsUsed تغییر نمی‌کند', () => {
    const engine = makeEngine();
    const { puzzleId } = engine.getDailyPuzzle(812);
    engine.evaluateGuess(puzzleId, expectedAnswer(812));
    expect(engine.getHint(puzzleId)).toBeNull();
    expect(engine.getState(puzzleId).hintsUsed).toBe(0);
  });
});

describe('now پیش‌فرض (Date.now) — شاخه‌ی fallback', () => {
  it('بدون تزریق now هم کار می‌کند', () => {
    const engine = createEngine({ wordDb: createMockWordDb() });
    const { puzzleId } = engine.getDailyPuzzle(1);
    expect(engine.getState(puzzleId).startedAt).toBeGreaterThan(0);
  });
});
