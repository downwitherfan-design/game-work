/**
 * @dordaneh/qa — suite قرارداد CultureApi (docs/02_CONTRACTS.md §3 + خط قرمز ۳۰)
 */

import { describe, expect, it } from 'vitest';
import type { CultureApi, CultureCard } from '@dordaneh/contracts';

export interface CultureSuiteFixture {
  makeCulture: () => CultureApi;
  /** بازه‌ی puzzleNumber برای پیمایش (پیش‌فرض ۱..۳۶۵) */
  scanRange?: { from: number; to: number };
  /** واژه‌ی جواب نمونه برای فراخوانی getCardForPuzzle */
  sampleSolution: string;
}

const KINDS = ['proverb', 'poem', 'fact', 'occasion'] as const;

function assertCardValid(card: CultureCard, ctx: string): void {
  expect(card.id, `${ctx}: id`).toBeTruthy();
  expect(KINDS, `${ctx}: kind`).toContain(card.kind);
  expect(card.title.trim().length, `${ctx}: title خالی`).toBeGreaterThan(0);
  expect(card.body.trim().length, `${ctx}: body خالی`).toBeGreaterThan(0);
  // خط قرمز ۳۰: منبع مستند اجباری
  expect(card.source.trim().length, `${ctx}: source اجباری است`).toBeGreaterThan(0);
  // سقف طول‌ها طبق قرارداد
  if (card.explanation !== undefined) {
    expect([...card.explanation].length, `${ctx}: explanation ≤ 220`).toBeLessThanOrEqual(220);
  }
  expect([...card.shareCaption].length, `${ctx}: shareCaption ≤ 140`).toBeLessThanOrEqual(140);
  if (card.occasionDate !== undefined) {
    expect(card.occasionDate, `${ctx}: occasionDate فرمت MM-DD`).toMatch(/^\d{2}-\d{2}$/);
  }
}

export function runCultureContractSuite(name: string, fx: CultureSuiteFixture): void {
  describe(`CultureApi contract — ${name}`, () => {
    const range = fx.scanRange ?? { from: 1, to: 365 };

    it('getCardForPuzzle قطعی است (دو نمونه‌ی مستقل، کارت یکسان)', () => {
      const a = fx.makeCulture();
      const b = fx.makeCulture();
      for (let n = range.from; n <= Math.min(range.from + 60, range.to); n++) {
        expect(a.getCardForPuzzle(n, fx.sampleSolution)).toEqual(
          b.getCardForPuzzle(n, fx.sampleSolution),
        );
      }
    });

    it('هر کارتِ بازه معتبر است: source اجباری، explanation ≤ ۲۲۰، shareCaption ≤ ۱۴۰', () => {
      const culture = fx.makeCulture();
      for (let n = range.from; n <= range.to; n++) {
        assertCardValid(culture.getCardForPuzzle(n, fx.sampleSolution), `puzzle #${n}`);
      }
    });

    it('getAlbum: total با تعداد کارت‌ها سازگار و همه‌ی کارت‌های آلبوم معتبرند', () => {
      const { total, cards } = fx.makeCulture().getAlbum();
      expect(total).toBeGreaterThan(0);
      expect(cards.length).toBeLessThanOrEqual(total);
      const ids = new Set<string>();
      for (const card of cards) {
        assertCardValid(card, `album:${card.id}`);
        expect(ids.has(card.id), `id تکراری در آلبوم: ${card.id}`).toBe(false);
        ids.add(card.id);
      }
    });
  });
}
