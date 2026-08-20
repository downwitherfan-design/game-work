/**
 * کاتالوگ فروشگاه — فقط «راحتی، محتوا، ظاهر». هرگز قدرت (خط قرمز ۱۲).
 * قیمت‌ها از remote config می‌آیند (تست دو نقطه‌ی قیمتی — Lean Analytics)؛
 * فالبک آفلاین همیشه موجود است.
 */

import type { AnalyticsApi, Sku } from '@dordaneh/contracts';

export type SkuKind = 'golden' | 'content' | 'cosmetic';

export interface CatalogItem {
  sku: Sku;
  kind: SkuKind;
  /** کلید i18n عنوان/توضیح — متن در locales/fa.json */
  titleKey: string;
  descKey: string;
  /** آیکن ایموجی سبک (بدون asset باینری) */
  emoji: string;
  /** قیمت پیش‌فرض به تومان — فقط فالبک؛ منبع حقیقت remote config است. */
  fallbackPriceToman: number;
  /** کلید remote config قیمت */
  priceConfigKey: string;
}

export const CATALOG: readonly CatalogItem[] = [
  {
    sku: 'golden',
    kind: 'golden',
    titleKey: 'monetization.golden.title',
    descKey: 'monetization.golden.desc',
    emoji: '👑',
    fallbackPriceToman: 149_000,
    priceConfigKey: 'price.golden',
  },
  {
    sku: 'pack_cooking',
    kind: 'content',
    titleKey: 'monetization.pack.cooking.title',
    descKey: 'monetization.pack.cooking.desc',
    emoji: '🍲',
    fallbackPriceToman: 49_000,
    priceConfigKey: 'price.pack_cooking',
  },
  {
    sku: 'pack_cinema',
    kind: 'content',
    titleKey: 'monetization.pack.cinema.title',
    descKey: 'monetization.pack.cinema.desc',
    emoji: '🎬',
    fallbackPriceToman: 49_000,
    priceConfigKey: 'price.pack_cinema',
  },
  {
    sku: 'pack_sport',
    kind: 'content',
    titleKey: 'monetization.pack.sport.title',
    descKey: 'monetization.pack.sport.desc',
    emoji: '⚽',
    fallbackPriceToman: 49_000,
    priceConfigKey: 'price.pack_sport',
  },
  {
    sku: 'pack_classic',
    kind: 'content',
    titleKey: 'monetization.pack.classic.title',
    descKey: 'monetization.pack.classic.desc',
    emoji: '📜',
    fallbackPriceToman: 59_000,
    priceConfigKey: 'price.pack_classic',
  },
  {
    sku: 'theme_pack_1',
    kind: 'cosmetic',
    titleKey: 'monetization.theme1.title',
    descKey: 'monetization.theme1.desc',
    emoji: '🎨',
    fallbackPriceToman: 39_000,
    priceConfigKey: 'price.theme_pack_1',
  },
];

export function getCatalogItem(sku: Sku): CatalogItem {
  const item = CATALOG.find((x) => x.sku === sku);
  // کاتالوگ همه‌ی Skuهای قرارداد را پوشش می‌دهد؛ این شاخه فقط برای ایمنی تایپ.
  if (!item) throw new Error(`unknown sku: ${sku}`);
  return item;
}

/**
 * قیمت نهایی از remote config (A/B دو نقطه‌ی قیمتی) با فالبک آفلاین.
 * UI صادقانه: همین عدد نمایش داده می‌شود — بدون «تخفیف جعلی».
 */
export function getPriceToman(
  item: CatalogItem,
  analytics?: Pick<AnalyticsApi, 'getRemoteConfig'>,
): number {
  if (!analytics) return item.fallbackPriceToman;
  try {
    const v = analytics.getRemoteConfig<number>(item.priceConfigKey, item.fallbackPriceToman);
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : item.fallbackPriceToman;
  } catch {
    return item.fallbackPriceToman;
  }
}
