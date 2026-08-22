import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import { difficultyToTier, wordDb } from '../src/api';
import { answers6, practiceByTier, validWordSet } from '../src/data';

describe('getAnswer', () => {
  it('جواب روز ۱ = اولین عضو آرایه (پیروزی ۳۰ثانیه‌ای)', () => {
    expect(wordDb.getAnswer(1, 6)).toBe(answers6[0]);
  });

  it('قطعی است: چند فراخوانی = یک نتیجه', () => {
    for (const n of [1, 7, 100, 812]) {
      expect(wordDb.getAnswer(n, 6)).toBe(wordDb.getAnswer(n, 6));
    }
  });

  it('چرخه: puzzleNumber بزرگ‌تر از طول آرایه wrap می‌شود', () => {
    const size = answers6.length;
    expect(wordDb.getAnswer(size + 1, 6)).toBe(answers6[0]);
    expect(wordDb.getAnswer(2 * size + 3, 6)).toBe(answers6[2]);
  });

  it('ورودی‌های مرزی (صفر/منفی/اعشاری/NaN) هرگز undefined نمی‌دهند', () => {
    for (const n of [0, -5, 3.7, Number.NaN]) {
      const w = wordDb.getAnswer(n, 6);
      expect(typeof w).toBe('string');
      expect([...w].length).toBe(6);
    }
  });

  it('هر جواب ۶حرفی، نرمال و داخل valid-words است', () => {
    for (let n = 1; n <= 30; n++) {
      const w = wordDb.getAnswer(n, 6);
      expect([...w].length).toBe(6);
      expect(w).toBe(normalizeFa(w));
      expect(validWordSet.has(w)).toBe(true);
    }
  });

  it('طول غیر ۶: جواب قطعی از استخر تمرین همان طول', () => {
    for (const L of [4, 5, 7]) {
      const w = wordDb.getAnswer(1, L);
      expect([...w].length).toBe(L);
      expect(wordDb.getAnswer(1, L)).toBe(w);
    }
  });

  it('طول بدون استخر → خطای صریح', () => {
    expect(() => wordDb.getAnswer(1, 12)).toThrow();
  });
});

describe('getPracticeAnswer', () => {
  it('قطعی است: seed یکسان = کلمه‌ی یکسان', () => {
    for (const seed of [0, 1, 42, 999999]) {
      const a = wordDb.getPracticeAnswer(seed, 3);
      const b = wordDb.getPracticeAnswer(seed, 3);
      expect(a).toEqual(b);
    }
  });

  it('wordLength گزارش‌شده با طول واقعی کلمه می‌خواند', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { word, wordLength } = wordDb.getPracticeAnswer(seed, 2);
      expect([...word].length).toBe(wordLength);
      expect(wordLength).toBeGreaterThanOrEqual(4);
      expect(wordLength).toBeLessThanOrEqual(7);
    }
  });

  it('دشواری به tier درست نگاشت می‌شود', () => {
    expect(difficultyToTier(1)).toBe(1);
    expect(difficultyToTier(2)).toBe(1);
    expect(difficultyToTier(3)).toBe(2);
    expect(difficultyToTier(4)).toBe(2);
    expect(difficultyToTier(5)).toBe(3);
    // مرزی
    expect(difficultyToTier(0)).toBe(1);
    expect(difficultyToTier(99)).toBe(3);
  });

  it('کلمه از tier مربوط به دشواری انتخاب می‌شود', () => {
    const t1Words = new Set(practiceByTier[1].map((p) => p.word));
    const t3Words = new Set(practiceByTier[3].map((p) => p.word));
    for (let seed = 0; seed < 30; seed++) {
      expect(t1Words.has(wordDb.getPracticeAnswer(seed, 1).word)).toBe(true);
      expect(t3Words.has(wordDb.getPracticeAnswer(seed, 5).word)).toBe(true);
    }
  });

  it('توزیع seedها یکنواخت است (نه همیشه یک کلمه)', () => {
    const words = new Set<string>();
    for (let seed = 0; seed < 200; seed++) words.add(wordDb.getPracticeAnswer(seed, 3).word);
    expect(words.size).toBeGreaterThan(100);
  });
});

describe('isValidWord', () => {
  it('جواب‌ها معتبرند', () => {
    expect(wordDb.isValidWord(answers6[0] as string)).toBe(true);
  });

  it('رشته‌ی تصادفی نامعتبر است', () => {
    expect(wordDb.isValidWord('قطظژذض')).toBe(false);
    expect(wordDb.isValidWord('')).toBe(false);
    expect(wordDb.isValidWord('abc')).toBe(false);
  });

  it('کلمات رایج فارسی معتبرند', () => {
    for (const w of ['کتاب', 'مادر', 'دوست', 'زندگی', 'ایران']) {
      expect(wordDb.isValidWord(normalizeFa(w))).toBe(true);
    }
  });
});

describe('getWordMeta', () => {
  it('برای هر جواب ۶حرفی متادیتا برمی‌گرداند', () => {
    for (const w of answers6.slice(0, 20)) {
      const m = wordDb.getWordMeta(w);
      expect(m).not.toBeNull();
      expect([1, 2, 3]).toContain(m?.freqTier);
    }
  });

  it('برای کلمه‌ی تمرین متادیتا برمی‌گرداند', () => {
    const p = practiceByTier[1][0];
    expect(p).toBeDefined();
    const m = wordDb.getWordMeta((p as { word: string }).word);
    expect(m).not.toBeNull();
  });

  it('برای کلمه‌ی ناشناس null برمی‌گرداند', () => {
    expect(wordDb.getWordMeta('ژژژژژژ')).toBeNull();
  });
});
