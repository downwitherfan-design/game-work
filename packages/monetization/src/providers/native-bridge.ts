/**
 * پل native مشترک — interface پلاگین Capacitor که AI-14 در `native/` wire می‌کند.
 *
 * معماری: SDK های تپسل/بازار/مایکت هرگز در باندل وب import نمی‌شوند؛
 * فقط در runtime اندروید، از `globalThis` (پل Capacitor تزریق‌شده توسط AI-14)
 * به‌صورت دینامیک برداشته می‌شوند. اگر پل موجود نباشد → degrade امن.
 *
 * قرارداد پل (مستند کامل در README همین پکیج، بخش «Wiring برای AI-14»):
 *   globalThis.DordanehNative = {
 *     tapsell?:  { isRewardedReady(zoneId), showRewarded(zoneId) → 'rewarded'|'skipped'|'unavailable' }
 *     bazaarIap?:{ purchase(sku) → {result, purchaseToken?}, getPurchases() }
 *     myketIap?: { purchase(sku) → {result, purchaseToken?}, getPurchases() }
 *   }
 */

import type { PurchaseResult, Sku } from '@dordaneh/contracts';

export interface TapsellBridge {
  isRewardedReady(zoneId: string): Promise<boolean>;
  showRewarded(zoneId: string): Promise<'rewarded' | 'skipped' | 'unavailable'>;
}

export interface IapBridge {
  purchase(sku: string): Promise<{ result: PurchaseResult; purchaseToken?: string }>;
  getPurchases(): Promise<{ sku: string; purchaseToken: string }[]>;
}

export interface DordanehNativeBridge {
  tapsell?: TapsellBridge;
  bazaarIap?: IapBridge;
  myketIap?: IapBridge;
}

/** برداشتن امن پل native از globalThis — بدون exception در وب. */
export function getNativeBridge(): DordanehNativeBridge | null {
  const g = globalThis as { DordanehNative?: unknown };
  const bridge = g.DordanehNative;
  if (bridge && typeof bridge === 'object') return bridge as DordanehNativeBridge;
  return null;
}

/** آیا sku معتبر استور است؟ (پل رشته‌ی خام برمی‌گرداند) */
export function asSku(raw: string): Sku | null {
  const known: readonly string[] = [
    'golden',
    'pack_cooking',
    'pack_cinema',
    'pack_sport',
    'pack_classic',
    'theme_pack_1',
  ];
  return known.includes(raw) ? (raw as Sku) : null;
}
