import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import { createMockEngine, evaluate } from '../src/mocks/mock-engine';

describe('ارزیابی دوپاسه (الگوریتم Wordle)', () => {
  it('همه correct وقتی حدس = جواب', () => {
    expect(evaluate('ایرانی', 'ایرانی')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('حروف تکراری: present فقط به اندازه‌ی موجودی جواب', () => {
    // جواب «دد» و حدس «دا»: د اول correct، ا absent
    expect(evaluate('دد', 'دا')).toEqual(['correct', 'absent']);
    // جواب «دا» و حدس «دد»: د اول correct، د دوم absent (موجودی تمام شد)
    expect(evaluate('دا', 'دد')).toEqual(['correct', 'absent']);
    // جواب «ادد» و حدس «ددا»: د وسط سرجایش (correct)، بقیه present
    expect(evaluate('ادد', 'ددا')).toEqual(['present', 'correct', 'present']);
  });

  it('correct بر present اولویت دارد (پاس اول)', () => {
    // جواب «ابا» حدس «اàا» — ساده: جواب «ابا» حدس «باا»
    expect(evaluate('ابا', 'باا')).toEqual(['present', 'present', 'correct']);
  });
});

describe('mock موتور — قرارداد EngineApi', () => {
  it('معمای روزانه قطعی است (همان شماره = همان معما)', () => {
    const e1 = createMockEngine();
    const e2 = createMockEngine();
    expect(e1.getDailyPuzzle(5)).toEqual(e2.getDailyPuzzle(5));
    expect(e1.getDailyPuzzle(5).puzzleId).toBe('daily-5');
    expect(e1.getDailyPuzzle(5).wordLength).toBe(6);
  });

  it('معمای تمرینی با seed قطعی است', () => {
    const e1 = createMockEngine();
    const e2 = createMockEngine();
    const p1 = e1.getPracticePuzzle(3, 42);
    const p2 = e2.getPracticePuzzle(3, 42);
    expect(p1.puzzleId).toBe(p2.puzzleId);
    expect(p1.puzzleId).toBe('practice-42');
  });

  it('معمای آنبوردینگ همیشه «دردانه» است', () => {
    const e = createMockEngine();
    const p = e.getOnboardingPuzzle();
    typeAndWin(e, p.puzzleId, 'دردانه');
  });

  it('WRONG_LENGTH و INVALID_WORD طبق قرارداد', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(1);
    expect(e.evaluateGuess(puzzleId, 'ابج')).toEqual({ error: 'WRONG_LENGTH' });
    expect(e.evaluateGuess(puzzleId, 'ببببببب'.slice(0, 6))).toEqual({ error: 'INVALID_WORD' });
  });

  it('پس از برد، solution در state پر می‌شود و بازی قفل است', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(1); // ایرانی
    typeAndWin(e, puzzleId, 'ایرانی');
    const s = e.getState(puzzleId);
    expect(s.status).toBe('won');
    expect(s.solution).toBe(normalizeFa('ایرانی'));
    expect(s.finishedAt).toBeDefined();
    expect(e.evaluateGuess(puzzleId, 'ایرانی')).toEqual({ error: 'INVALID_WORD' });
  });

  it('پس از ۶ حدس غلط status=lost می‌شود', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(1);
    for (let i = 0; i < 6; i++) {
      const r = e.evaluateGuess(puzzleId, 'دوستان');
      expect('error' in r).toBe(false);
    }
    expect(e.getState(puzzleId).status).toBe('lost');
  });

  it('getState برای معمای ناشناخته state خالی امن می‌دهد', () => {
    const e = createMockEngine();
    const s = e.getState('ghost-1');
    expect(s.guesses).toEqual([]);
    expect(s.status).toBe('playing');
  });

  it('getHint اولین جایگاه حل‌نشده را می‌دهد و hintsUsed را بالا می‌برد', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(1); // ایرانی
    const h = e.getHint(puzzleId);
    expect(h).toEqual({ letter: 'ا', position: 0 });
    expect(e.getState(puzzleId).hintsUsed).toBe(1);
  });

  it('getHint روی بازی تمام‌شده null می‌دهد', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(1);
    typeAndWin(e, puzzleId, 'ایرانی');
    expect(e.getHint(puzzleId)).toBeNull();
  });
});

function typeAndWin(
  e: ReturnType<typeof createMockEngine>,
  puzzleId: string,
  word: string,
): void {
  const r = e.evaluateGuess(puzzleId, word);
  expect('error' in r).toBe(false);
  if (!('error' in r)) expect(r.states.every((s) => s === 'correct')).toBe(true);
}
