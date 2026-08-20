/**
 * تست‌های ویژه‌ی فارسی (الزام مأموریت):
 * کلمات با «آ»، تکرار حرف، ورودی با اعراب/ي/ك/ZWNJ — باید پس از
 * نرمال‌سازی (normalizeFa قرارداد) درست ارزیابی شوند.
 */
import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import { createEngine } from '../src/engine';
import { evaluateGuessAgainst } from '../src/evaluate-guess';
import { ANSWERS_6, createMockWordDb } from './fixtures/mock-word-db';

function engineFor(puzzleNumber: number): {
  engine: ReturnType<typeof createEngine>;
  puzzleId: string;
  answer: string;
} {
  const engine = createEngine({ wordDb: createMockWordDb(), now: () => 1 });
  const { puzzleId } = engine.getDailyPuzzle(puzzleNumber);
  return { engine, puzzleId, answer: ANSWERS_6[puzzleNumber % ANSWERS_6.length] as string };
}

describe('کلمات با «آ»', () => {
  it('«آ» در نرمال‌سازی حفظ می‌شود و با «ا» یکی نیست', () => {
    expect(normalizeFa('آبادان')).toBe('آبادان');
    expect(normalizeFa('آبادان')).not.toBe('ابادان');
  });

  it('جواب آبادان: حدس با «ا» به‌جای «آ» در جایگاه ۰، correct نمی‌گیرد', () => {
    // جواب: آبادان (آ ب ا د ا ن) — حدس: ایرانی (ا ی ر ا ن ی)
    // ا(۰) ≠ آ(۰) → نه correct؛ ولی «ا» در جواب هست → present
    const result = evaluateGuessAgainst('ایرانی', 'آبادان');
    expect(result.states[0]).toBe('present'); // ا — در جواب هست ولی جایگاه ۰ «آ» است
  });

  it('چرخه‌ی کامل: معمای با جواب آسمانی از مسیر موتور برد می‌شود', () => {
    // ایندکس ۱۷ = آسمانی
    const { engine, puzzleId } = engineFor(17);
    const r = engine.evaluateGuess(puzzleId, 'آسمانی');
    expect('states' in r && r.states.every((s) => s === 'correct')).toBe(true);
  });
});

describe('ورودی با ي/ك عربی', () => {
  it('حدس با «ي» عربی درست ارزیابی می‌شود (ي→ی)', () => {
    // جواب معمای ۳: ایرانی — حدس همان کلمه با ي عربی
    const { engine, puzzleId } = engineFor(3);
    const r = engine.evaluateGuess(puzzleId, 'ايراني');
    expect('states' in r && r.states.every((s) => s === 'correct')).toBe(true);
    expect('guess' in r && r.guess === 'ایرانی').toBe(true); // خروجی نرمال‌شده
  });

  it('حدس با «ك» عربی درست ارزیابی می‌شود (ك→ک)', () => {
    // جواب معمای ۱: کتابها
    const { engine, puzzleId } = engineFor(1);
    const r = engine.evaluateGuess(puzzleId, 'كتابها');
    expect('states' in r && r.states.every((s) => s === 'correct')).toBe(true);
  });
});

describe('ورودی با اعراب (تشکیل)', () => {
  it('اعراب حذف و حدس درست ارزیابی می‌شود', () => {
    // جواب معمای ۱: کتابها — حدس با فتحه و تشدید
    const { engine, puzzleId } = engineFor(1);
    const r = engine.evaluateGuess(puzzleId, 'کَتابَها');
    expect('states' in r && r.states.every((s) => s === 'correct')).toBe(true);
  });

  it('اعراب طول مؤثر را تغییر نمی‌دهد (WRONG_LENGTH نمی‌گیرد)', () => {
    const { engine, puzzleId } = engineFor(1);
    const r = engine.evaluateGuess(puzzleId, 'کِتِابِهِا'); // ۶ حرف + اعراب
    expect('error' in r).toBe(false);
  });
});

describe('ورودی با ZWNJ (نیم‌فاصله)', () => {
  it('ZWNJ در مقایسه حذف می‌شود', () => {
    const { engine, puzzleId } = engineFor(1);
    const r = engine.evaluateGuess(puzzleId, 'کتاب\u200Cها'); // کتاب‌ها با نیم‌فاصله
    expect('states' in r && r.states.every((s) => s === 'correct')).toBe(true);
  });
});

describe('تکرار حرف در کلمات فارسی واقعی (از مسیر کامل موتور)', () => {
  it('دردانه در برابر دندانه: الگوی درست', () => {
    const { engine, puzzleId } = engineFor(0); // دردانه
    const r = engine.evaluateGuess(puzzleId, 'دندانه');
    expect('states' in r && r.states).toEqual([
      'correct',
      'absent',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('باغبان (ب و ا تکراری) در برابر بارانی', () => {
    // جواب: باغبان (ب ا غ ب ا ن) — حدس: بارانی (ب ا ر ا ن ی)
    // گذر۱: ب(۰)،ا(۱) correct. سهمیه: غ=۱،ب=۱،ا=۱،ن=۱
    // گذر۲: ر(۲) absent، ا(۳) present(ا:۰)، ن(۴) present(ن:۰)، ی(۵) absent
    const { engine, puzzleId } = engineFor(4);
    const r = engine.evaluateGuess(puzzleId, 'بارانی');
    expect('states' in r && r.states).toEqual([
      'correct',
      'correct',
      'absent',
      'present',
      'present',
      'absent',
    ]);
  });
});

describe('ترکیب همه: ي عربی + اعراب + ZWNJ + تکرار حرف در یک حدس', () => {
  it('ورودی «کثیف» کامل، درست نرمال و ارزیابی می‌شود', () => {
    const { engine, puzzleId } = engineFor(3); // ایرانی
    const dirty = 'اي\u200Cرَاني'; // ي عربی + ZWNJ + فتحه
    const r = engine.evaluateGuess(puzzleId, dirty);
    expect('states' in r && r.states.every((s) => s === 'correct')).toBe(true);
  });
});
