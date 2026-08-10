import { describe, it, expect } from 'vitest';
import {
  normalizeFa,
  toPersianDigits,
  tehranDateString,
  puzzleNumberForDate,
  puzzleNumberForNow,
  PUZZLE_EPOCH,
  PUZZLE_TIMEZONE,
} from '../src/core';

describe('normalizeFa', () => {
  it('maps Arabic yeh/kaf to Persian (ي→ی، ك→ک)', () => {
    expect(normalizeFa('علي')).toBe('علی');
    expect(normalizeFa('كتاب')).toBe('کتاب');
  });

  it('maps yeh variants (ى، ۍ، ے) to ی', () => {
    expect(normalizeFa('\u0649')).toBe('\u06CC');
    expect(normalizeFa('\u06CD')).toBe('\u06CC');
    expect(normalizeFa('\u06D2')).toBe('\u06CC');
  });

  it('maps kaf variant ڪ to ک', () => {
    expect(normalizeFa('\u06AA')).toBe('\u06A9');
  });

  it('maps ۀ and ة to ه', () => {
    expect(normalizeFa('خانۀ')).toBe('خانه');
    expect(normalizeFa('مدرسة')).toBe('مدرسه');
  });

  it('maps hamza forms أ/إ→ا and ؤ→و but preserves آ', () => {
    expect(normalizeFa('\u0623')).toBe('\u0627');
    expect(normalizeFa('\u0625')).toBe('\u0627');
    expect(normalizeFa('\u0624')).toBe('\u0648');
    expect(normalizeFa('آب')).toBe('آب');
  });

  it('removes diacritics (tashkeel) and tatweel', () => {
    expect(normalizeFa('کِتاب')).toBe('کتاب');
    expect(normalizeFa('مَدْرَسَه')).toBe('مدرسه');
    expect(normalizeFa('کتـــاب')).toBe('کتاب'); // tatweel \u0640
  });

  it('removes ZWNJ and ZWJ for comparison', () => {
    expect(normalizeFa('می\u200Cروم')).toBe('میروم');
    expect(normalizeFa('ا\u200Dب')).toBe('اب');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeFa('  کتاب  ')).toBe('کتاب');
  });

  it('applies NFC unicode normalization', () => {
    // آ decomposed (ا + madda above) → NFC آ
    expect(normalizeFa('\u0627\u0653')).toBe('\u0622');
  });

  it('is idempotent', () => {
    const once = normalizeFa('علي كتاب می\u200Cخوانَد');
    expect(normalizeFa(once)).toBe(once);
  });

  it('passes through already-normal text unchanged', () => {
    expect(normalizeFa('دردانه')).toBe('دردانه');
    expect(normalizeFa('')).toBe('');
  });
});

describe('toPersianDigits', () => {
  it('converts numbers to Persian digits', () => {
    expect(toPersianDigits(812)).toBe('۸۱۲');
    expect(toPersianDigits(0)).toBe('۰');
    expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰');
  });

  it('converts digit characters inside strings, leaving the rest', () => {
    expect(toPersianDigits('دُردانه #812')).toBe('دُردانه #۸۱۲');
    expect(toPersianDigits('بدون رقم')).toBe('بدون رقم');
  });
});

describe('tehranDateString', () => {
  it('formats an instant as YYYY-MM-DD in Asia/Tehran', () => {
    // 2026-09-01T00:00Z = 03:30 in Tehran (+03:30) → same date
    expect(tehranDateString(new Date('2026-09-01T00:00:00Z'))).toBe('2026-09-01');
  });

  it('rolls the date forward across Tehran midnight', () => {
    // 2026-08-31T21:00Z = 2026-09-01 00:30 Tehran
    expect(tehranDateString(new Date('2026-08-31T21:00:00Z'))).toBe('2026-09-01');
    // 2026-08-31T20:00Z = 2026-08-31 23:30 Tehran
    expect(tehranDateString(new Date('2026-08-31T20:00:00Z'))).toBe('2026-08-31');
  });
});

describe('puzzleNumberForDate', () => {
  it('returns 1 on the epoch day (2026-09-01 Tehran)', () => {
    expect(puzzleNumberForDate(new Date('2026-09-01T08:00:00Z'))).toBe(1);
    // just after Tehran midnight of epoch day
    expect(puzzleNumberForDate(new Date('2026-08-31T21:00:00Z'))).toBe(1);
  });

  it('returns 0 the day before the epoch', () => {
    expect(puzzleNumberForDate(new Date('2026-08-31T12:00:00Z'))).toBe(0);
  });

  it('increments exactly at Tehran midnight', () => {
    // 2026-09-01T20:29Z = 23:59 Tehran → still day 1
    expect(puzzleNumberForDate(new Date('2026-09-01T20:29:00Z'))).toBe(1);
    // 2026-09-01T20:30Z = 2026-09-02 00:00 Tehran → day 2
    expect(puzzleNumberForDate(new Date('2026-09-01T20:30:00Z'))).toBe(2);
  });

  it('counts long spans correctly (month boundaries)', () => {
    // Sep has 30 days → 2026-10-01 = day 31
    expect(puzzleNumberForDate(new Date('2026-10-01T08:00:00Z'))).toBe(31);
    // one full year later (2027 not a leap year within span: 2026-09-01→2027-09-01 = 365 days)
    expect(puzzleNumberForDate(new Date('2027-09-01T08:00:00Z'))).toBe(366);
  });
});

describe('puzzleNumberForNow', () => {
  it('matches puzzleNumberForDate(new Date())', () => {
    expect(puzzleNumberForNow()).toBe(puzzleNumberForDate(new Date()));
  });
});

describe('constants', () => {
  it('exposes the puzzle epoch and timezone', () => {
    expect(PUZZLE_EPOCH).toBe('2026-09-01');
    expect(PUZZLE_TIMEZONE).toBe('Asia/Tehran');
  });
});
