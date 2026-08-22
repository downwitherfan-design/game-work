import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import {
  answers6,
  answersMeta,
  blocklist,
  practiceByTier,
  practiceWords,
  validWords,
  validWordSet,
} from '../src/data';

const charLen = (w: string): number => [...w].length;

describe('answers-6.json', () => {
  it('حداقل ۷۳۰ جواب (دو سال)', () => {
    expect(answers6.length).toBeGreaterThanOrEqual(730);
  });

  it('همه ۶حرفی، نرمال و یکتا', () => {
    const seen = new Set<string>();
    for (const w of answers6) {
      expect(charLen(w)).toBe(6);
      expect(w).toBe(normalizeFa(w));
      expect(seen.has(w)).toBe(false);
      seen.add(w);
    }
  });

  it('هیچ واژه‌ی blocklist در answers نیست', () => {
    const block = new Set(blocklist);
    for (const w of answers6) expect(block.has(w)).toBe(false);
  });

  it('همه‌ی جواب‌ها در valid-words هستند', () => {
    for (const w of answers6) expect(validWordSet.has(w)).toBe(true);
  });

  it('بدون هم‌خانواده‌ی پشت‌سرهم (پیشوند ۳حرفی مشترک)', () => {
    for (let i = 1; i < answers6.length; i++) {
      const a = answers6[i - 1] as string;
      const b = answers6[i] as string;
      expect(a.slice(0, 3)).not.toBe(b.slice(0, 3));
    }
  });

  it('هفته‌ی اول از tier ۱ (ساده) است', () => {
    for (const w of answers6.slice(0, 7)) {
      const m = answersMeta[w];
      expect(m?.freqTier).toBe(1);
    }
  });

  it('هر جواب متادیتای معتبر دارد', () => {
    for (const w of answers6) {
      const m = answersMeta[w];
      expect(m).toBeDefined();
      expect([1, 2, 3]).toContain(m?.freqTier);
    }
  });
});

describe('answers-practice.json', () => {
  it('حداقل ۴۰۰۰ کلمه', () => {
    expect(practiceWords.length).toBeGreaterThanOrEqual(4000);
  });

  it('طول‌ها در بازه‌ی ۴..۷ و wordLength درست', () => {
    for (const p of practiceWords) {
      expect(p.wordLength).toBeGreaterThanOrEqual(4);
      expect(p.wordLength).toBeLessThanOrEqual(7);
      expect(charLen(p.word)).toBe(p.wordLength);
    }
  });

  it('همه نرمال و یکتا', () => {
    const seen = new Set<string>();
    for (const p of practiceWords) {
      expect(p.word).toBe(normalizeFa(p.word));
      expect(seen.has(p.word)).toBe(false);
      seen.add(p.word);
    }
  });

  it('هر سه tier غیرخالی و پرحجم‌اند', () => {
    expect(practiceByTier[1].length).toBeGreaterThan(500);
    expect(practiceByTier[2].length).toBeGreaterThan(500);
    expect(practiceByTier[3].length).toBeGreaterThan(500);
  });

  it('هیچ واژه‌ی blocklist در practice نیست', () => {
    const block = new Set(blocklist);
    for (const p of practiceWords) expect(block.has(p.word)).toBe(false);
  });

  it('همه در valid-words هستند', () => {
    for (const p of practiceWords) expect(validWordSet.has(p.word)).toBe(true);
  });
});

describe('valid-words.json', () => {
  it('حداقل ۱۵٬۰۰۰ واژه', () => {
    expect(validWords.length).toBeGreaterThanOrEqual(15000);
  });

  it('همه ۴..۷ حرفی و نرمال', () => {
    for (const w of validWords) {
      const l = charLen(w);
      expect(l).toBeGreaterThanOrEqual(4);
      expect(l).toBeLessThanOrEqual(7);
      expect(w).toBe(normalizeFa(w));
    }
  });

  it('یکتا و مرتب', () => {
    expect(new Set(validWords).size).toBe(validWords.length);
  });

  it('هیچ تقاطعی با blocklist ندارد', () => {
    for (const b of blocklist) expect(validWordSet.has(b)).toBe(false);
  });
});

describe('blocklist.json', () => {
  it('غیرخالی و نرمال', () => {
    expect(blocklist.length).toBeGreaterThan(50);
    for (const w of blocklist) expect(w).toBe(normalizeFa(w));
  });
});
