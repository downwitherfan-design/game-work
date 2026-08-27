import { describe, expect, it } from 'vitest';
import type { GuessEvaluation } from '@dordaneh/contracts';
import { computeKeyStates } from '../src/logic/key-states';

function g(guess: string, states: GuessEvaluation['states']): GuessEvaluation {
  return { guess, states };
}

describe('وضعیت رنگ کلیدهای کیبورد', () => {
  it('حالت‌های پایه را نگاشت می‌کند', () => {
    const map = computeKeyStates([g('درد', ['correct', 'present', 'absent'])]);
    expect(map.get('د')).toBe('correct'); // د هم correct هم absent → correct می‌ماند
    expect(map.get('ر')).toBe('present');
  });

  it('ارتقا مجاز است: absent → present → correct', () => {
    const map = computeKeyStates([
      g('ب', ['absent']),
      g('ب', ['present']),
      g('ب', ['correct']),
    ]);
    expect(map.get('ب')).toBe('correct');
  });

  it('تنزل ممنوع: کلید سبز هرگز زرد/خاکستری نمی‌شود', () => {
    const map = computeKeyStates([g('ن', ['correct']), g('ن', ['absent'])]);
    expect(map.get('ن')).toBe('correct');
  });

  it('present با absent بعدی تنزل نمی‌کند', () => {
    const map = computeKeyStates([g('م', ['present']), g('م', ['absent'])]);
    expect(map.get('م')).toBe('present');
  });

  it('حالت‌های empty/tbd نادیده گرفته می‌شوند', () => {
    const map = computeKeyStates([g('س', ['tbd']), g('ش', ['empty'])]);
    expect(map.size).toBe(0);
  });

  it('بدون حدس → نگاشت خالی', () => {
    expect(computeKeyStates([]).size).toBe(0);
  });
});
