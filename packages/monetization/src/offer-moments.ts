/**
 * موتور «لحظه‌های پیشنهاد» — پیشنهاد طلایی فقط در peak ارزش ادراک‌شده.
 *
 * قواعد قطعی (پرامپت AI-11):
 *  - فقط دو لحظه‌ی «ارزش لمس‌شده»:
 *      ۱) بعد از مصرف Streak Freeze (کاربر نجات استریک را حس کرده)
 *      ۲) کسب دستاورد استریک ۱۴
 *  - هرگز مودال فروش وسط بازی یا ابتدای جلسه.
 *  - هرگز در جلسه‌ی اول. هرگز برای کاربر طلایی.
 *  - frequency cap: حداکثر یک پیشنهاد در هر ۷ روز و حداکثر ۳ بار در کل عمر
 *    (پیشنهاد تکراری = مزاحمت؛ نقض فلسفه‌ی محصول).
 *
 * مبنا: پیشنهاد در peak ارزش ادراک‌شده = تبدیل بالاتر بدون رنجش
 * (Peak-End، Kahneman 1993؛ reciprocity، Cialdini 1984).
 *
 * این ماژول فقط «تصمیم» می‌گیرد و callback می‌دهد — نمایش UI با app-shell است
 * (بنر ملایم/شیت پایین، نه مودال مسدودکننده).
 */

import type { EventBus, StorageApi } from '@dordaneh/contracts';
import { isFirstSession } from './ad-policy';
import { readIapState, writeIapState } from './iap-state';

export type OfferTrigger = 'freeze_used' | 'streak_14';

export interface OfferMomentConfig {
  /** حداقل فاصله بین دو پیشنهاد (ms) — پیش‌فرض ۷ روز */
  minIntervalMs: number;
  /** سقف کل عمر */
  lifetimeCap: number;
  /** آستانه‌ی استریک دستاورد */
  streakThreshold: number;
}

export const DEFAULT_OFFER_CONFIG: OfferMomentConfig = {
  minIntervalMs: 7 * 24 * 3600_000,
  lifetimeCap: 3,
  streakThreshold: 14,
};

export type ShowOfferFn = (trigger: OfferTrigger) => void;

/** آیا الان نمایش پیشنهاد مجاز است؟ (بدون ثبت) */
export function canShowOffer(
  storage: StorageApi,
  nowMs: number,
  config: OfferMomentConfig = DEFAULT_OFFER_CONFIG,
): boolean {
  if (isFirstSession(storage)) return false;
  const state = readIapState(storage);
  if (state.owned.includes('golden')) return false;
  const offer = state.offer ?? { lastShownAt: 0, count: 0 };
  if (offer.count >= config.lifetimeCap) return false;
  if (nowMs - offer.lastShownAt < config.minIntervalMs) return false;
  return true;
}

/** ثبت یک نمایش پیشنهاد (پس از نمایش واقعی UI). */
export function recordOfferShown(storage: StorageApi, nowMs: number): void {
  const state = readIapState(storage);
  const prev = state.offer ?? { lastShownAt: 0, count: 0 };
  state.offer = { lastShownAt: nowMs, count: prev.count + 1 };
  writeIapState(storage, state);
}

/**
 * اتصال به EventBus — گوش‌دادن به streak_changed:
 *  - frozen=true → «فریز مصرف شد» (لحظه‌ی نجات استریک)
 *  - value == streakThreshold → دستاورد استریک ۱۴
 * خروجی: تابع قطع اتصال.
 */
export function attachOfferMoments(
  storage: StorageApi,
  bus: EventBus,
  showOffer: ShowOfferFn,
  config: OfferMomentConfig = DEFAULT_OFFER_CONFIG,
  now: () => number = (): number => Date.now(),
): () => void {
  const off = bus.on('streak_changed', (e) => {
    let trigger: OfferTrigger | null = null;
    if (e.frozen) trigger = 'freeze_used';
    else if (e.value === config.streakThreshold) trigger = 'streak_14';
    if (!trigger) return;
    if (!canShowOffer(storage, now(), config)) return;
    recordOfferShown(storage, now());
    try {
      showOffer(trigger);
    } catch {
      // خطای UI هرگز جریان بازی را نمی‌شکند
    }
  });
  return off;
}
