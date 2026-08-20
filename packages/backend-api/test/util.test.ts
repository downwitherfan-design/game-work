import { describe, expect, it } from 'vitest';
import {
  computeScore,
  dailyChecksum,
  defaultName,
  isPlausibleResult,
  isValidAnonId,
  isValidPuzzleNumber,
  randomSeed,
  sanitizeName,
  shortId,
  MAX_NAME_LENGTH,
} from '../src/util';

const ANON = '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

describe('isValidAnonId', () => {
  it('accepts UUIDv4', () => {
    expect(isValidAnonId(ANON)).toBe(true);
    expect(isValidAnonId(crypto.randomUUID())).toBe(true);
  });
  it('rejects non-UUIDv4', () => {
    expect(isValidAnonId('')).toBe(false);
    expect(isValidAnonId('not-a-uuid')).toBe(false);
    expect(isValidAnonId(42)).toBe(false);
    expect(isValidAnonId(null)).toBe(false);
    // v1 UUID (نسخه‌ی نادرست)
    expect(isValidAnonId('9f1b2c3d-4e5f-1a6b-8c7d-0e1f2a3b4c5d')).toBe(false);
  });
});

describe('isValidPuzzleNumber', () => {
  it('accepts positive integers in range', () => {
    expect(isValidPuzzleNumber(1)).toBe(true);
    expect(isValidPuzzleNumber(812)).toBe(true);
  });
  it('rejects invalid values', () => {
    expect(isValidPuzzleNumber(0)).toBe(false);
    expect(isValidPuzzleNumber(-3)).toBe(false);
    expect(isValidPuzzleNumber(1.5)).toBe(false);
    expect(isValidPuzzleNumber(NaN)).toBe(false);
    expect(isValidPuzzleNumber('7')).toBe(false);
    expect(isValidPuzzleNumber(1_000_001)).toBe(false);
  });
});

describe('isPlausibleResult — ضد تقلب حداقلی', () => {
  it('accepts a normal win', () => {
    expect(isPlausibleResult({ won: true, guessCount: 3, durationMs: 45_000 })).toBe(true);
  });
  it('rejects win faster than 5s', () => {
    expect(isPlausibleResult({ won: true, guessCount: 1, durationMs: 4_999 })).toBe(false);
    expect(isPlausibleResult({ won: true, guessCount: 1, durationMs: 5_000 })).toBe(true);
  });
  it('rejects out-of-range guessCount', () => {
    expect(isPlausibleResult({ won: true, guessCount: 0, durationMs: 10_000 })).toBe(false);
    expect(isPlausibleResult({ won: true, guessCount: 7, durationMs: 10_000 })).toBe(false);
    expect(isPlausibleResult({ won: true, guessCount: 2.5, durationMs: 10_000 })).toBe(false);
  });
  it('requires loss to use all 6 guesses', () => {
    expect(isPlausibleResult({ won: false, guessCount: 6, durationMs: 60_000 })).toBe(true);
    expect(isPlausibleResult({ won: false, guessCount: 3, durationMs: 60_000 })).toBe(false);
  });
  it('rejects absurd durations', () => {
    expect(isPlausibleResult({ won: true, guessCount: 3, durationMs: -1 })).toBe(false);
    expect(isPlausibleResult({ won: true, guessCount: 3, durationMs: 7 * 60 * 60 * 1000 })).toBe(
      false,
    );
  });
});

describe('computeScore', () => {
  it('loss scores 0', () => {
    expect(computeScore(false, 6, 60_000)).toBe(0);
  });
  it('fewer guesses score higher', () => {
    const s1 = computeScore(true, 1, 30_000);
    const s4 = computeScore(true, 4, 30_000);
    expect(s1).toBeGreaterThan(s4);
  });
  it('faster wins score higher (same guesses)', () => {
    expect(computeScore(true, 3, 10_000)).toBeGreaterThan(computeScore(true, 3, 200_000));
  });
  it('never below 1 for a win', () => {
    expect(computeScore(true, 6, 6 * 60 * 60 * 1000)).toBeGreaterThanOrEqual(1);
  });
});

describe('sanitizeName', () => {
  it('keeps a normal Persian name', () => {
    expect(sanitizeName('سارا', ANON)).toBe('سارا');
  });
  it('normalizes Arabic ي/ك to Persian', () => {
    expect(sanitizeName('علي', ANON)).toBe('علی');
  });
  it('trims and collapses whitespace', () => {
    expect(sanitizeName('  آرش   خان  ', ANON)).toBe('آرش خان');
  });
  it('caps length', () => {
    const long = 'الف'.repeat(40);
    expect(sanitizeName(long, ANON).length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });
  it('strips control/bidi characters and emoji-punctuation noise', () => {
    expect(sanitizeName('سارا\u202E<script>', ANON)).toBe('ساراscript');
    expect(sanitizeName('نگار\u200Fجون', ANON)).toBe('نگارجون');
  });
  it('falls back to default for empty/non-string', () => {
    expect(sanitizeName('', ANON)).toMatch(/^مسافر [۰-۹]{4}$/);
    expect(sanitizeName(undefined, ANON)).toMatch(/^مسافر [۰-۹]{4}$/);
    expect(sanitizeName(123, ANON)).toMatch(/^مسافر [۰-۹]{4}$/);
  });
  it('blocks profanity (fa/en) even with separators', () => {
    expect(sanitizeName('جنده', ANON)).toMatch(/^مسافر /);
    expect(sanitizeName('f.u.c.k', ANON)).toMatch(/^مسافر /);
    expect(sanitizeName('FUCK', ANON)).toMatch(/^مسافر /);
  });
  it('default name is deterministic per anonId', () => {
    expect(defaultName(ANON)).toBe(defaultName(ANON));
  });
});

describe('shortId / randomSeed', () => {
  it('shortId is URL-safe with correct length', () => {
    const id = shortId(10);
    expect(id).toMatch(/^[a-z2-9]{10}$/);
    expect(shortId(6)).toHaveLength(6);
  });
  it('ids are unique enough', () => {
    const set = new Set(Array.from({ length: 200 }, () => shortId()));
    expect(set.size).toBe(200);
  });
  it('randomSeed is a positive 31-bit int', () => {
    for (let i = 0; i < 50; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(0x7fffffff);
    }
  });
});

describe('dailyChecksum', () => {
  it('is deterministic and normalizes the answer', async () => {
    const a = await dailyChecksum(812, 'دلاور');
    const b = await dailyChecksum(812, 'دلاور');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    // نرمال‌سازی: ي عربی → ی فارسی باید checksum یکسان بدهد
    expect(await dailyChecksum(1, 'علي')).toBe(await dailyChecksum(1, 'علی'));
  });
  it('differs per puzzle number and per word', async () => {
    expect(await dailyChecksum(1, 'دلاور')).not.toBe(await dailyChecksum(2, 'دلاور'));
    expect(await dailyChecksum(1, 'دلاور')).not.toBe(await dailyChecksum(1, 'دلبند'));
  });
});
