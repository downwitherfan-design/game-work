import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import { createMockEngine, evaluate } from '../src/mocks/engine.mock';

describe('evaluate — منطق رنگ‌ها (قواعد Wordle با حروف تکراری)', () => {
  it('همه درست', () => {
    expect(evaluate('دردانه', 'دردانه')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('present/absent درست', () => {
    // solution: دردانه — guess: هنرمند → ه(present) ن(present) ر(present) م(absent) ن(present) د(present)
    const states = evaluate('دردانه', 'هنرمند');
    expect(states).toHaveLength(6);
    expect(states[0]).toBe('present'); // ه در جواب هست
    expect(states[3]).toBe('absent'); // م در جواب نیست
  });

  it('حروف تکراری بیش از موجودی، absent می‌شوند', () => {
    // solution: «بادام» (ب‌ا‌د‌ا‌م) × حدس «اااام»:
    // ایندکس ۱و۳ («ا») و ۴ («م») correct؛ «ا»های اضافه (۰و۲) باید absent شوند
    // چون هر دو «ا»ی جواب قبلاً با correct مصرف شده‌اند.
    const states = evaluate('بادام', 'اااام');
    expect(states).toEqual(['absent', 'correct', 'absent', 'correct', 'correct']);
  });
});

describe('MockEngine — قرارداد EngineApi', () => {
  it('getDailyPuzzle قطعی است', () => {
    const e = createMockEngine();
    const a = e.getDailyPuzzle(5);
    const b = e.getDailyPuzzle(5);
    expect(a.puzzleId).toBe('daily-5');
    expect(a).toEqual(b);
    expect(a.wordLength).toBe(6);
  });

  it('getOnboardingPuzzle معمای آسان ۶ حرفی می‌دهد', () => {
    const e = createMockEngine();
    const p = e.getOnboardingPuzzle();
    expect(p.puzzleId).toBe('onboarding-1');
    expect(p.wordLength).toBe(6);
  });

  it('WRONG_LENGTH برای طول غلط', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getOnboardingPuzzle();
    expect(e.evaluateGuess(puzzleId, 'کوتاه')).toEqual({ error: 'WRONG_LENGTH' });
  });

  it('INVALID_WORD برای غیر-فارسی', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getOnboardingPuzzle();
    expect(e.evaluateGuess(puzzleId, 'abcdef')).toEqual({ error: 'INVALID_WORD' });
  });

  it('پیروزی: state → won + solution پر می‌شود', () => {
    const now = () => 1000;
    const e = createMockEngine(now);
    const { puzzleId } = e.getOnboardingPuzzle();
    const res = e.evaluateGuess(puzzleId, 'دُردانه'); // با اعراب — normalizeFa باید حل کند
    expect('error' in res).toBe(false);
    const st = e.getState(puzzleId);
    expect(st.status).toBe('won');
    expect(st.solution).toBe(normalizeFa('دردانه'));
    expect(st.finishedAt).toBe(1000);
  });

  it('۶ حدس غلط → lost', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(1);
    const wrong = normalizeFa('گلستان') === e.getState(puzzleId).solution ? 'مهربان' : 'گلستان';
    for (let i = 0; i < 6; i++) {
      const r = e.evaluateGuess(puzzleId, wrong);
      // اگر تصادفاً همان جواب بود تست بی‌معنا نشود
      if (!('error' in r) && r.states.every((s) => s === 'correct')) return;
    }
    expect(e.getState(puzzleId).status).toBe('lost');
  });

  it('پس از پایان، evaluateGuess حدس جدید ثبت نمی‌کند', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getOnboardingPuzzle();
    e.evaluateGuess(puzzleId, 'دردانه');
    const before = e.getState(puzzleId).guesses.length;
    e.evaluateGuess(puzzleId, 'گلستان');
    expect(e.getState(puzzleId).guesses.length).toBe(before);
  });

  it('getHint جایگاه حل‌نشده می‌دهد و hintsUsed را بالا می‌برد', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getOnboardingPuzzle();
    const h = e.getHint(puzzleId);
    expect(h).not.toBeNull();
    expect(h?.position).toBe(0);
    expect(e.getState(puzzleId).hintsUsed).toBe(1);
  });

  it('getHint پس از پایان → null', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getOnboardingPuzzle();
    e.evaluateGuess(puzzleId, 'دردانه');
    expect(e.getHint(puzzleId)).toBeNull();
  });

  it('getPracticePuzzle با seed قطعی است', () => {
    const e = createMockEngine();
    const a = e.getPracticePuzzle(3, 42);
    expect(a.puzzleId).toBe('practice-3-42');
    // بدون seed هم کار می‌کند
    const b = e.getPracticePuzzle(9); // difficulty clamp → 5
    expect(b.puzzleId.startsWith('practice-5-')).toBe(true);
  });

  it('getState کپی می‌دهد (نه مرجع داخلی)', () => {
    const e = createMockEngine();
    const { puzzleId } = e.getDailyPuzzle(2);
    const st = e.getState(puzzleId);
    st.guesses.push({ guess: 'x', states: [] });
    expect(e.getState(puzzleId).guesses.length).toBe(0);
  });
});
