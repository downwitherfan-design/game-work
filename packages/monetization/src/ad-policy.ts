/**
 * سیاست اخلاقی تبلیغ جایزه‌ای — قلب «درآمد از رضایت، نه از اذیت».
 *
 * قواعد قطعی (docs/01_RED_LINES.md بند ۱۳ + پرامپت AI-11):
 *  1. فقط Rewarded با رضایت صریح (پیش‌مودال شفاف).
 *  2. صفر تبلیغ در جلسه‌ی اول کاربر (فلگ آنبوردینگ از Storage).
 *  3. سقف روزانه: ۳ تبلیغ جایزه‌ای — کمیابی پاداش ارزشش را نگه می‌دارد
 *     (اشباع پاداش، Ferster & Skinner 1957) و تجربه ad-farm نمی‌شود.
 *  4. نسخه‌ی طلایی = بدون تبلیغ، همیشه.
 */

import type { StorageApi } from '@dordaneh/contracts';
import { STORAGE_KEYS } from '@dordaneh/contracts';
import { DAILY_REWARDED_AD_CAP } from './types';
import { readIapState, writeIapState } from './iap-state';

/**
 * فلگ آنبوردینگ در پروفایل (کلید رزروشده‌ی `dor.profile`، مالک داده: AI-05).
 * ما فقط «می‌خوانیم» — با چند نام مرسوم سازگاریم و در ابهام، محافظه‌کارانه
 * «جلسه‌ی اول» فرض می‌کنیم (امن‌ترین حالت: تبلیغ مخفی).
 */
interface ProfileLike {
  onboardingDone?: boolean;
  onboardingCompleted?: boolean;
  firstSessionDone?: boolean;
  sessionCount?: number;
}

/** آیا کاربر هنوز در جلسه‌ی اول است؟ ابهام → true (تبلیغ کاملاً مخفی). */
export function isFirstSession(storage: StorageApi): boolean {
  const profile = storage.get<ProfileLike>(STORAGE_KEYS.profile);
  if (profile === null || typeof profile !== 'object') return true;
  if (profile.onboardingDone === true) return false;
  if (profile.onboardingCompleted === true) return false;
  if (profile.firstSessionDone === true) return false;
  if (typeof profile.sessionCount === 'number' && profile.sessionCount > 1) return false;
  return true;
}

/** تاریخ محلی تهران به شکل YYYY-MM-DD — برای ریست شمارنده‌ی روزانه. */
export function tehranDateKey(nowMs: number): string {
  // en-CA => YYYY-MM-DD؛ Intl در همه‌ی WebViewهای هدف موجود است.
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(nowMs));
  } catch {
    // فالبک fail-soft: UTC+3:30
    return new Date(nowMs + 3.5 * 3600_000).toISOString().slice(0, 10);
  }
}

/** تعداد تبلیغ‌های دیده‌شده‌ی امروز. */
export function adsWatchedToday(storage: StorageApi, nowMs: number): number {
  const { ads } = readIapState(storage);
  return ads.date === tehranDateKey(nowMs) ? ads.count : 0;
}

/** ظرفیت باقی‌مانده‌ی امروز. */
export function adsRemainingToday(storage: StorageApi, nowMs: number): number {
  return Math.max(0, DAILY_REWARDED_AD_CAP - adsWatchedToday(storage, nowMs));
}

export type AdEligibility =
  | { eligible: true }
  | { eligible: false; reason: 'first_session' | 'golden' | 'daily_cap' };

/**
 * آیا نمایش تبلیغ جایزه‌ای الان مجاز است؟
 * ترتیب دلیل‌ها عمدی است: جلسه‌ی اول مقدم بر همه (بند ۱۳ خط قرمز).
 */
export function checkAdEligibility(storage: StorageApi, nowMs: number): AdEligibility {
  if (isFirstSession(storage)) return { eligible: false, reason: 'first_session' };
  if (readIapState(storage).owned.includes('golden')) {
    return { eligible: false, reason: 'golden' };
  }
  if (adsRemainingToday(storage, nowMs) <= 0) return { eligible: false, reason: 'daily_cap' };
  return { eligible: true };
}

/** ثبت یک تبلیغ تماشاشده (پس از reward واقعی، نه skip). */
export function recordAdWatched(storage: StorageApi, nowMs: number): void {
  const state = readIapState(storage);
  const today = tehranDateKey(nowMs);
  if (state.ads.date === today) {
    state.ads.count += 1;
  } else {
    state.ads = { date: today, count: 1 };
  }
  writeIapState(storage, state);
}

/**
 * آیا placementهای تبلیغی باید در UI «کلاً مخفی» باشند؟
 * جلسه‌ی اول یا کاربر طلایی → دکمه/گزینه اصلاً رندر نشود (نه disabled).
 */
export function shouldHideAdPlacements(storage: StorageApi): boolean {
  if (isFirstSession(storage)) return true;
  return readIapState(storage).owned.includes('golden');
}
