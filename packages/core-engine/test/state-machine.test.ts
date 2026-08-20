/**
 * تست‌های ماشین حالت — پوشش ۱۰۰٪ شاخه‌ها (الزام مأموریت).
 * playing → won / lost؛ جلوگیری از حدس پس از پایان.
 */
import { describe, expect, it } from 'vitest';
import {
  applyGuess,
  canAcceptGuess,
  createInitialState,
  EngineError,
  markHintUsed,
} from '../src/state-machine';
import { evaluateGuessAgainst } from '../src/evaluate-guess';
import type { PuzzleState } from '@dordaneh/contracts';

const SOLUTION = 'دردانه';
const T0 = 1_760_000_000_000;

function freshState(): PuzzleState {
  return createInitialState('daily-812', 6, 6, T0);
}

function wrongGuess(): ReturnType<typeof evaluateGuessAgainst> {
  return evaluateGuessAgainst('کتابها', SOLUTION);
}

function winningGuess(): ReturnType<typeof evaluateGuessAgainst> {
  return evaluateGuessAgainst(SOLUTION, SOLUTION);
}

describe('createInitialState', () => {
  it('حالت اولیه: playing، بدون حدس، بدون solution', () => {
    const s = freshState();
    expect(s).toEqual({
      puzzleId: 'daily-812',
      wordLength: 6,
      maxGuesses: 6,
      guesses: [],
      status: 'playing',
      hintsUsed: 0,
      startedAt: T0,
    });
    expect(s.solution).toBeUndefined();
    expect(s.finishedAt).toBeUndefined();
  });
});

describe('canAcceptGuess', () => {
  it('playing با حدس باقیمانده → true', () => {
    expect(canAcceptGuess(freshState())).toBe(true);
  });

  it('پس از won → false', () => {
    const s = applyGuess(freshState(), winningGuess(), SOLUTION, T0 + 1000);
    expect(canAcceptGuess(s)).toBe(false);
  });

  it('پس از lost → false', () => {
    let s = freshState();
    for (let i = 0; i < 6; i++) s = applyGuess(s, wrongGuess(), SOLUTION, T0 + i);
    expect(s.status).toBe('lost');
    expect(canAcceptGuess(s)).toBe(false);
  });

  it('حالت ناسازگار (playing ولی حدس‌ها پر) → false (شاخه‌ی دفاعی)', () => {
    const s = freshState();
    const full: PuzzleState = {
      ...s,
      guesses: Array.from({ length: 6 }, () => wrongGuess()),
      status: 'playing', // ناسازگار عمدی
    };
    expect(canAcceptGuess(full)).toBe(false);
  });
});

describe('applyGuess — گذارها', () => {
  it('حدس غلط غیرآخر → playing می‌ماند، حدس ثبت می‌شود، solution فاش نمی‌شود', () => {
    const s = applyGuess(freshState(), wrongGuess(), SOLUTION, T0 + 5);
    expect(s.status).toBe('playing');
    expect(s.guesses).toHaveLength(1);
    expect(s.solution).toBeUndefined();
    expect(s.finishedAt).toBeUndefined();
  });

  it('حدس برنده → won + solution + finishedAt', () => {
    const s = applyGuess(freshState(), winningGuess(), SOLUTION, T0 + 9000);
    expect(s.status).toBe('won');
    expect(s.solution).toBe(SOLUTION);
    expect(s.finishedAt).toBe(T0 + 9000);
    expect(s.guesses).toHaveLength(1);
  });

  it('برد در حدس ششم (آخرین فرصت) → won نه lost', () => {
    let s = freshState();
    for (let i = 0; i < 5; i++) s = applyGuess(s, wrongGuess(), SOLUTION, T0 + i);
    s = applyGuess(s, winningGuess(), SOLUTION, T0 + 99);
    expect(s.status).toBe('won');
    expect(s.guesses).toHaveLength(6);
  });

  it('حدس ششم ناموفق → lost + solution + finishedAt', () => {
    let s = freshState();
    for (let i = 0; i < 6; i++) s = applyGuess(s, wrongGuess(), SOLUTION, T0 + i);
    expect(s.status).toBe('lost');
    expect(s.solution).toBe(SOLUTION);
    expect(s.finishedAt).toBe(T0 + 5);
    expect(s.guesses).toHaveLength(6);
  });

  it('⛔ حدس پس از won → EngineError(GAME_OVER)', () => {
    const s = applyGuess(freshState(), winningGuess(), SOLUTION, T0);
    expect(() => applyGuess(s, wrongGuess(), SOLUTION, T0 + 1)).toThrowError(EngineError);
    try {
      applyGuess(s, wrongGuess(), SOLUTION, T0 + 1);
    } catch (e) {
      expect((e as EngineError).code).toBe('GAME_OVER');
    }
  });

  it('⛔ حدس پس از lost → EngineError(GAME_OVER)', () => {
    let s = freshState();
    for (let i = 0; i < 6; i++) s = applyGuess(s, wrongGuess(), SOLUTION, T0 + i);
    expect(() => applyGuess(s, wrongGuess(), SOLUTION, T0 + 7)).toThrowError(EngineError);
  });

  it('immutability: ورودی جهش نمی‌کند', () => {
    const before = freshState();
    const snapshot = JSON.parse(JSON.stringify(before)) as PuzzleState;
    applyGuess(before, wrongGuess(), SOLUTION, T0 + 1);
    expect(before).toEqual(snapshot);
  });
});

describe('markHintUsed', () => {
  it('hintsUsed را یکی زیاد می‌کند (immutable)', () => {
    const s = freshState();
    const s2 = markHintUsed(s);
    expect(s.hintsUsed).toBe(0);
    expect(s2.hintsUsed).toBe(1);
    expect(markHintUsed(s2).hintsUsed).toBe(2);
  });
});

describe('EngineError', () => {
  it('کد و نام درست دارد', () => {
    const e = new EngineError('UNKNOWN_PUZZLE', 'پیام');
    expect(e.code).toBe('UNKNOWN_PUZZLE');
    expect(e.name).toBe('EngineError');
    expect(e).toBeInstanceOf(Error);
  });
});
