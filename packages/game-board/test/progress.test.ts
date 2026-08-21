import { describe, expect, it } from 'vitest';
import type { GuessEvaluation } from '@dordaneh/contracts';
import { computeProgress } from '../src/logic/progress';

function g(guess: string, states: GuessEvaluation['states']): GuessEvaluation {
  return { guess, states };
}

describe('نوار حس پیشرفت (شیب هدف)', () => {
  it('بدون حدس: صفر', () => {
    const p = computeProgress([], 6);
    expect(p.found).toBe(0);
    expect(p.total).toBe(6);
    expect(p.ratio).toBe(0);
  });

  it('حروف correct و present شمرده می‌شوند، absent نه', () => {
    const p = computeProgress([g('درختان', ['correct', 'present', 'absent', 'absent', 'absent', 'absent'])], 6);
    expect(p.found).toBe(2); // د و ر
  });

  it('حرف تکراری کشف‌شده فقط یک‌بار شمرده می‌شود', () => {
    const p = computeProgress(
      [g('دد', ['correct', 'present']), g('دن', ['correct', 'present'])],
      6,
    );
    expect(p.found).toBe(2); // د یک‌بار + ن
  });

  it('found هرگز از total بیشتر نمی‌شود', () => {
    const p = computeProgress(
      [g('ابج', ['correct', 'correct', 'correct']), g('دهو', ['present', 'present', 'present'])],
      3,
    );
    expect(p.found).toBe(3);
    expect(p.ratio).toBe(1);
  });

  it('wordLength صفر یا منفی سقوط نمی‌کند', () => {
    const p = computeProgress([], 0);
    expect(p.total).toBe(1);
    expect(p.ratio).toBe(0);
  });
});
