/**
 * @dordaneh/culture-cards — مالک: AI-03.
 * پیاده‌سازی CultureApi طبق docs/02_CONTRACTS.md §3.
 *
 * اولویت انتخاب کارت (قطعی و آفلاین — هرگز Math.random):
 *  ۱) کارتی که occasionDate آن با تاریخ شمسیِ معمای امروز یکی است.
 *  ۲) کارتی که relatedWord آن با جوابِ نرمال‌شده‌ی معما یکی است.
 *  ۳) چرخش قطعی روی بقیه با puzzleNumber % n — روی استخری که kind ها را
 *     یک‌درمیان می‌چیند تا روزهای متوالی یکنواخت نشوند (Berlyne, 1960).
 */
import type { CultureApi, CultureCard } from '@dordaneh/contracts';
import { normalizeFa } from '@dordaneh/contracts';
import { shamsiMMDDForPuzzle } from './jalali';
import cardsData from '../data/cards.json';

export type { CultureApi, CultureCard, CardKind } from '@dordaneh/contracts';
export { shamsiMMDDForPuzzle } from './jalali';
export {
  validateCards,
  EXPLANATION_MAX,
  SHARE_CAPTION_MAX,
  MIN_CARDS_TARGET,
} from './validate';
export type { ValidationResult } from './validate';

const ALL_CARDS: readonly CultureCard[] = cardsData as CultureCard[];

/**
 * استخر چرخش روزانه: کارت‌های بدون occasionDate (مناسبت‌ها فقط در روز
 * خودشان ظاهر می‌شوند)، بازچینی‌شده به‌صورت round-robin بین kind ها.
 * چینش فقط به محتوای data/cards.json وابسته است → کاملاً قطعی.
 */
function buildRotationPool(cards: readonly CultureCard[]): CultureCard[] {
  const buckets = new Map<string, CultureCard[]>();
  for (const c of cards) {
    if (c.occasionDate !== undefined) continue;
    const list = buckets.get(c.kind) ?? [];
    list.push(c);
    buckets.set(c.kind, list);
  }
  // ترتیب ثابت kind ها برای قطعیت
  const kindOrder = ['proverb', 'poem', 'fact', 'occasion'];
  const queues = kindOrder
    .filter((k) => buckets.has(k))
    .map((k) => ({ items: buckets.get(k) as CultureCard[], i: 0 }));

  const pool: CultureCard[] = [];
  let remaining = queues.reduce((s, q) => s + q.items.length, 0);
  while (remaining > 0) {
    for (const q of queues) {
      const item = q.items[q.i];
      if (item !== undefined) {
        pool.push(item);
        q.i += 1;
        remaining -= 1;
      }
    }
  }
  return pool;
}

/** کارخانه‌ی API — تزریق داده برای تست‌پذیری؛ خروجی پیش‌فرض روی cards.json. */
export function createCultureApi(cards: readonly CultureCard[] = ALL_CARDS): CultureApi {
  const rotationPool = buildRotationPool(cards);

  return {
    getCardForPuzzle(puzzleNumber: number, solutionWord: string): CultureCard {
      const n =
        Number.isFinite(puzzleNumber) && puzzleNumber >= 1 ? Math.floor(puzzleNumber) : 1;

      // ۱) مناسبتِ امروز (تاریخ شمسی قطعیِ خود معما)
      const today = shamsiMMDDForPuzzle(n);
      const occasion = cards.find((c) => c.occasionDate === today);
      if (occasion !== undefined) return occasion;

      // ۲) پیوند معنایی با جواب معما («آها!»ی دوم — Craik & Lockhart, 1972)
      const solution = normalizeFa(solutionWord);
      if (solution.length > 0) {
        const related = cards.filter((c) => c.relatedWord === solution);
        const pick = related[n % Math.max(related.length, 1)];
        if (pick !== undefined) return pick;
      }

      // ۳) چرخش قطعی روی بقیه
      const fallback = rotationPool[n % Math.max(rotationPool.length, 1)];
      if (fallback !== undefined) return fallback;

      // استخر خالی (فقط در تست‌های داده‌ی تزریقی ممکن است)
      throw new Error('culture-cards: هیچ کارتی برای انتخاب وجود ندارد');
    },

    getAlbum(): { total: number; cards: CultureCard[] } {
      return { total: cards.length, cards: [...cards] };
    },
  };
}

/** نمونه‌ی آماده روی داده‌ی رسمی پکیج. */
export const cultureApi: CultureApi = createCultureApi();
