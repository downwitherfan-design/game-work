import { describe, expect, it } from 'vitest';
import type { PuzzleState } from '@dordaneh/contracts';
import {
  DUEL_DNF,
  DUEL_TTL_MS,
  buildDuelComparisonGrid,
  canRevealOpponent,
  decideVerdict,
  defaultPlayerName,
  generateAnonId,
  isDuelExpired,
  outcomeFromPuzzleState,
  parseDuelPath,
} from '../src/index';

describe('decideVerdict — «حدس کمتر، سپس زمان کمتر»', () => {
  it('حدس کمتر می‌برد (زمان مهم نیست)', () => {
    expect(decideVerdict({ guessCount: 3, durationMs: 900_000 }, { guessCount: 5, durationMs: 10 })).toBe('win');
    expect(decideVerdict({ guessCount: 5, durationMs: 10 }, { guessCount: 3, durationMs: 900_000 })).toBe('loss');
  });
  it('حدس برابر → زمان کمتر می‌برد', () => {
    expect(decideVerdict({ guessCount: 4, durationMs: 60_000 }, { guessCount: 4, durationMs: 61_000 })).toBe('win');
    expect(decideVerdict({ guessCount: 4, durationMs: 61_000 }, { guessCount: 4, durationMs: 60_000 })).toBe('loss');
  });
  it('حدس و زمان برابر → مساوی', () => {
    expect(decideVerdict({ guessCount: 4, durationMs: 60_000 }, { guessCount: 4, durationMs: 60_000 })).toBe('draw');
  });
  it('حل‌نکرده (DNF) همیشه از حل‌کرده می‌بازد', () => {
    expect(decideVerdict({ guessCount: DUEL_DNF, durationMs: 1 }, { guessCount: 6, durationMs: 999_999 })).toBe('loss');
    expect(decideVerdict({ guessCount: 6, durationMs: 999_999 }, { guessCount: DUEL_DNF, durationMs: 1 })).toBe('win');
  });
  it('دو حل‌نکرده → مساوی', () => {
    expect(decideVerdict({ guessCount: DUEL_DNF, durationMs: 1 }, { guessCount: DUEL_DNF, durationMs: 2 })).toBe('draw');
  });
});

describe('isDuelExpired — انقضای ۷۲ ساعته', () => {
  const t0 = 1_700_000_000_000;
  it('قبل از ۷۲ ساعت منقضی نیست', () => {
    expect(isDuelExpired(t0, t0 + DUEL_TTL_MS - 1)).toBe(false);
  });
  it('دقیقاً/بعد از ۷۲ ساعت منقضی است', () => {
    expect(isDuelExpired(t0, t0 + DUEL_TTL_MS)).toBe(true);
    expect(isDuelExpired(t0, t0 + DUEL_TTL_MS + 1)).toBe(true);
  });
});

function puzzle(status: 'won' | 'lost', guessCount: number, durationMs: number): PuzzleState {
  return {
    puzzleId: 'duel-x',
    wordLength: 6,
    maxGuesses: 6,
    guesses: Array.from({ length: guessCount }, () => ({
      guess: 'ابتکار',
      states: ['correct', 'present', 'absent', 'correct', 'correct', 'correct'],
    })),
    status,
    hintsUsed: 0,
    startedAt: 1000,
    finishedAt: 1000 + durationMs,
  };
}

describe('outcomeFromPuzzleState', () => {
  it('برد → تعداد حدس واقعی + زمان', () => {
    const out = outcomeFromPuzzleState(puzzle('won', 4, 90_000));
    expect(out).toEqual({ guessCount: 4, durationMs: 90_000 });
  });
  it('باخت → DUEL_DNF (کانونشن RFC-0002)', () => {
    const out = outcomeFromPuzzleState(puzzle('lost', 6, 120_000));
    expect(out.guessCount).toBe(DUEL_DNF);
    expect(out.durationMs).toBe(120_000);
  });
  it('finishedAt غایب → زمان صفر (نه منفی)', () => {
    const p = puzzle('won', 2, 0);
    delete p.finishedAt;
    expect(outcomeFromPuzzleState(p).durationMs).toBe(0);
  });
});

describe('canRevealOpponent — دروازه‌ی ضد اسپویل', () => {
  it('قبل از ثبت نتیجه‌ی خودم: هرگز', () => {
    expect(canRevealOpponent(null)).toBe(false);
  });
  it('پس از ثبت نتیجه: مجاز', () => {
    expect(canRevealOpponent({ guessCount: 3, durationMs: 1 })).toBe(true);
    expect(canRevealOpponent({ guessCount: DUEL_DNF, durationMs: 1 })).toBe(true);
  });
});

describe('buildDuelComparisonGrid — بی‌اسپویلر', () => {
  it('گرید ایموجی بدون هیچ حرفی از جواب', () => {
    const grid = buildDuelComparisonGrid(puzzle('won', 2, 5000), 'من', { name: 'رضا', guessCount: 4 });
    expect(grid).toContain('⚔️');
    expect(grid).toContain('من: ۲/۶');
    expect(grid).toContain('رضا: ۴/۶');
    expect(grid).toContain('🟩');
    expect(grid).not.toContain('ابتکار'); // بی‌اسپویلر
  });
  it('باخت خودم → X/۶؛ حریف DNF → X/۶', () => {
    const grid = buildDuelComparisonGrid(puzzle('lost', 6, 5000), 'من', { name: 'رضا', guessCount: DUEL_DNF });
    expect(grid).toContain('من: X/۶');
    expect(grid).toContain('رضا: X/۶');
  });
  it('بدون حریف → تک‌ستونه', () => {
    const grid = buildDuelComparisonGrid(puzzle('won', 3, 5000), 'من');
    expect(grid).toContain('من: ۳/۶');
    expect(grid).not.toContain('رضا');
  });
});

describe('generateAnonId / defaultPlayerName', () => {
  it('UUID شکل‌درست و یکتا', () => {
    const a = generateAnonId();
    const b = generateAnonId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
  it('نام پیش‌فرض «مسافر + عدد فارسی»', () => {
    expect(defaultPlayerName(1234)).toBe('مسافر ۱۲۳۴');
    expect(defaultPlayerName()).toMatch(/^مسافر [۰-۹]+$/);
  });
});

describe('parseDuelPath', () => {
  it('استخراج id از /duel/:id', () => {
    expect(parseDuelPath('/duel/abc-123')).toBe('abc-123');
    expect(parseDuelPath('/duel/abc-123/')).toBe('abc-123');
  });
  it('مسیر landing یا نامعتبر → null', () => {
    expect(parseDuelPath('/duel')).toBeNull();
    expect(parseDuelPath('/duel/')).toBeNull();
    expect(parseDuelPath('/duel/a/b')).toBeNull();
    expect(parseDuelPath('/stats')).toBeNull();
  });
});
