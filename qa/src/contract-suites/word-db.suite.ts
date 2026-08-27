/**
 * @dordaneh/qa — suite قرارداد WordDbApi (docs/02_CONTRACTS.md §2)
 * قابل‌اجرا روی هر پیاده‌سازی: mock مرجع امروز، @dordaneh/word-db واقعی فردا.
 */

import { describe, expect, it } from 'vitest';
import { normalizeFa, type WordDbApi } from '@dordaneh/contracts';
import { toChars } from '../oracle';

export interface WordDbSuiteFixture {
  makeDb: () => WordDbApi;
  /** blocklist شناخته‌شده‌ی همان دیتاست (برای assert عدم حضور) */
  blocklist: readonly string[];
  /** بازه‌ی puzzleNumber برای پیمایش چرخه (پیش‌فرض ۱..۷۳۰ ≈ دو سال) */
  scanRange?: { from: number; to: number };
  /** طول چرخه‌ی مورد انتظار answers-6 (اگر معلوم است) برای تست «تکرار زودهنگام» */
  cycleLength?: number;
}

export function runWordDbContractSuite(name: string, fx: WordDbSuiteFixture): void {
  describe(`WordDbApi contract — ${name}`, () => {
    const range = fx.scanRange ?? { from: 1, to: 730 };

    it('getAnswer قطعی است (دو نمونه‌ی مستقل، خروجی یکسان)', () => {
      const a = fx.makeDb();
      const b = fx.makeDb();
      for (let n = range.from; n <= Math.min(range.from + 50, range.to); n++) {
        expect(a.getAnswer(n, 6)).toBe(b.getAnswer(n, 6));
      }
    });

    it('همه‌ی جواب‌های بازه نرمال‌اند (idempotent تحت normalizeFa)', () => {
      const db = fx.makeDb();
      for (let n = range.from; n <= range.to; n++) {
        const w = db.getAnswer(n, 6);
        expect(w, `puzzle #${n}`).toBe(normalizeFa(w));
      }
    });

    it('همه‌ی جواب‌های بازه دقیقاً ۶ نویسه‌اند (پس از نرمال‌سازی)', () => {
      const db = fx.makeDb();
      for (let n = range.from; n <= range.to; n++) {
        expect(toChars(db.getAnswer(n, 6)).length, `puzzle #${n}`).toBe(6);
      }
    });

    it('هیچ جوابی در blocklist نیست', () => {
      const db = fx.makeDb();
      const blocked = new Set(fx.blocklist.map(normalizeFa));
      for (let n = range.from; n <= range.to; n++) {
        expect(blocked.has(db.getAnswer(n, 6)), `puzzle #${n}`).toBe(false);
      }
    });

    it('هر جواب خودش واژه‌ی معتبر است (answers ⊆ valid-words)', () => {
      const db = fx.makeDb();
      for (let n = range.from; n <= range.to; n++) {
        const w = db.getAnswer(n, 6);
        expect(db.isValidWord(w), `«${w}» (puzzle #${n})`).toBe(true);
      }
    });

    it('چرخه‌ی ایندکس بدون تکرار زودهنگام (هیچ جوابی زودتر از طول چرخه تکرار نمی‌شود)', () => {
      const db = fx.makeDb();
      const seen = new Map<string, number>();
      const horizon = fx.cycleLength ?? range.to - range.from + 1;
      for (let n = range.from; n <= range.to; n++) {
        const w = db.getAnswer(n, 6);
        const prev = seen.get(w);
        if (prev !== undefined) {
          expect(n - prev, `«${w}» در #${prev} و #${n}`).toBeGreaterThanOrEqual(
            Math.min(horizon, fx.cycleLength ?? Infinity),
          );
        }
        seen.set(w, n);
      }
    });

    it('getPracticeAnswer قطعی است و word/wordLength سازگارند', () => {
      const db = fx.makeDb();
      for (let d = 1; d <= 5; d++) {
        for (let seed = 0; seed < 20; seed++) {
          const a = db.getPracticeAnswer(seed, d);
          const b = fx.makeDb().getPracticeAnswer(seed, d);
          expect(a).toEqual(b);
          expect(toChars(a.word).length).toBe(a.wordLength);
          expect(a.word).toBe(normalizeFa(a.word));
        }
      }
    });

    it('isValidWord برای ورودی غیرنرمال سخت‌گیر نیست به شکل کاذب (نرمال‌شده‌ی جواب معتبر است)', () => {
      const db = fx.makeDb();
      const w = db.getAnswer(range.from, 6);
      expect(db.isValidWord(normalizeFa(w))).toBe(true);
    });

    it('getWordMeta برای جواب موجود null نیست و freqTier ∈ {1,2,3}', () => {
      const db = fx.makeDb();
      const meta = db.getWordMeta(db.getAnswer(range.from, 6));
      expect(meta).not.toBeNull();
      if (meta) expect([1, 2, 3]).toContain(meta.freqTier);
    });

    it('getWordMeta برای رشته‌ی ناموجود null است', () => {
      const db = fx.makeDb();
      expect(db.getWordMeta('ژژژژژژ')).toBeNull();
    });
  });
}
