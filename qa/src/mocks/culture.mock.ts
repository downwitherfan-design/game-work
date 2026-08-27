/**
 * @dordaneh/qa — mock مرجع CultureApi (تا آماده‌شدن @dordaneh/culture-cards از AI-03).
 * طبق docs/02_CONTRACTS.md §3: هر کارت source اجباری، explanation ≤ ۲۲۰،
 * shareCaption ≤ ۱۴۰، getCardForPuzzle قطعی.
 */

import { normalizeFa, type CultureApi, type CultureCard } from '@dordaneh/contracts';

export const MOCK_CARDS: readonly CultureCard[] = [
  {
    id: 'card-0001',
    kind: 'proverb',
    title: 'ضرب‌المثل روز',
    body: 'هر که بامش بیش، برفش بیشتر.',
    explanation: 'مسئولیت و دردسر با دارایی و مقام بیشتر می‌شود.',
    source: 'امثال و حکم دهخدا، ج ۴',
    shareCaption: 'امروز در دُردانه یاد گرفتم: «هر که بامش بیش، برفش بیشتر» 🎴',
  },
  {
    id: 'card-0002',
    kind: 'poem',
    title: 'شعر روز',
    body: 'توانا بود هر که دانا بود / ز دانش دل پیر برنا بود',
    explanation: 'ستایش دانایی در آغاز شاهنامه.',
    source: 'شاهنامه‌ی فردوسی، آغاز کتاب',
    relatedWord: normalizeFa('دانایی'),
    shareCaption: 'کارت فرهنگی امروز دُردانه: توانا بود هر که دانا بود 📜',
  },
  {
    id: 'card-0003',
    kind: 'fact',
    title: 'دانستنی روز',
    body: 'واژه‌ی «دُردانه» یعنی دانه‌ی دُر؛ مرواریدِ یگانه و گران‌بها.',
    source: 'فرهنگ فارسی معین، مدخل دردانه',
    shareCaption: 'می‌دانستی «دُردانه» یعنی مروارید یگانه؟ 💎',
  },
] as const;

export function createMockCulture(): CultureApi {
  return {
    getCardForPuzzle(puzzleNumber: number): CultureCard {
      const idx =
        ((puzzleNumber % MOCK_CARDS.length) + MOCK_CARDS.length) % MOCK_CARDS.length;
      return MOCK_CARDS[idx] as CultureCard;
    },
    getAlbum(): { total: number; cards: CultureCard[] } {
      return { total: MOCK_CARDS.length, cards: [...MOCK_CARDS] };
    },
  };
}
