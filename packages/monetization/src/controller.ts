/**
 * کنترلر مونتیزیشن — پیاده‌سازی MonetizationApi قرارداد (§10) + wiring رویدادها.
 *
 * جریان تبلیغ جایزه‌ای:
 *   reward_ad_requested → بررسی سیاست (جلسه‌ی اول؟ طلایی؟ سقف ۳/روز؟)
 *   → پیش‌مودال شفاف رضایت («تماشای ویدئو = ۱ راهنما — قبوله؟»)
 *   → نمایش provider → در صورت reward: ثبت شمارنده + emit(reward_ad_completed)
 *
 * فلسفه: درآمد از رضایت، نه از اذیت. هر مرحله بدون رضایت = خروج محترمانه.
 */

import type {
  MonetizationApi,
  PurchaseResult,
  RewardedPlacement,
  RewardedResult,
  Sku,
} from '@dordaneh/contracts';
import type { MonetizationDeps } from './types';
import { checkAdEligibility, recordAdWatched, shouldHideAdPlacements } from './ad-policy';
import { grantSku, readIapState } from './iap-state';
import { createMockAdProvider, createMockIapProvider } from './providers/mock';

export interface MonetizationController extends MonetizationApi {
  /** آیا placementهای تبلیغی باید در UI کلاً مخفی باشند؟ (جلسه‌ی اول/طلایی) */
  adPlacementsHidden(): boolean;
  /** بازگردانی خرید — دکمه‌ی همیشه در دسترس ShopScreen. */
  restorePurchases(): Promise<{ restored: Sku[] }>;
  /** wiring رویدادها را جدا می‌کند تا در تست/SSR اختیاری باشد. */
  attachEventListeners(): () => void;
}

export function createMonetization(deps: MonetizationDeps): MonetizationController {
  const storage = deps.storage;
  const bus = deps.bus;
  const now = deps.now ?? ((): number => Date.now());
  const adProvider = deps.adProvider ?? createMockAdProvider();
  const iapProvider = deps.iapProvider ?? createMockIapProvider();
  // بدون presenter (محیط بدون UI): رضایت قابل اخذ نیست → تبلیغ نمایش نده.
  const presentConsent = deps.presentConsent ?? (async (): Promise<boolean> => false);

  /** قفل هم‌زمانی — دو درخواست موازی تبلیغ، یکی بیشتر نمایش داده نمی‌شود. */
  let adInFlight = false;

  async function showRewardedAd(placement: RewardedPlacement): Promise<RewardedResult> {
    // ۱) سیاست اخلاقی — مقدم بر همه چیز
    const eligibility = checkAdEligibility(storage, now());
    if (!eligibility.eligible) return 'unavailable';
    if (adInFlight) return 'unavailable';

    adInFlight = true;
    try {
      // ۲) موجودی provider
      const ready = await adProvider.isReady(placement);
      if (!ready) return 'unavailable';

      // ۳) رضایت صریح — پیش‌مودال شفاف، دکمه‌ی بستن واقعی، بدون فریب
      const consented = await presentConsent(placement);
      if (!consented) return 'skipped';

      // ۴) نمایش
      const result = await adProvider.show(placement);

      // ۵) فقط پاداش واقعی شمارنده را مصرف می‌کند و رویداد می‌دهد
      if (result === 'rewarded') {
        recordAdWatched(storage, now());
        bus.emit({ type: 'reward_ad_completed', placement });
      }
      return result;
    } catch {
      return 'unavailable'; // silent degrade — اپ آفلاین-اول
    } finally {
      adInFlight = false;
    }
  }

  async function purchase(sku: Sku): Promise<PurchaseResult> {
    try {
      const { result, purchaseToken } = await iapProvider.purchase(sku);
      if (result === 'ok') {
        grantSku(storage, {
          sku,
          purchaseToken: purchaseToken ?? `unknown-${now()}`,
          provider: iapProvider.id,
          purchasedAt: now(),
          verified: iapProvider.id === 'mock',
        });
        bus.emit({ type: 'purchase_completed', sku });
      }
      return result;
    } catch {
      return 'error';
    }
  }

  async function restorePurchases(): Promise<{ restored: Sku[] }> {
    try {
      const purchases = await iapProvider.restore();
      const restored: Sku[] = [];
      for (const p of purchases) {
        const before = readIapState(storage).owned.includes(p.sku);
        grantSku(storage, {
          sku: p.sku,
          purchaseToken: p.purchaseToken,
          provider: iapProvider.id,
          purchasedAt: now(),
          verified: true, // از خود استور آمده
        });
        if (!before) restored.push(p.sku);
      }
      return { restored };
    } catch {
      return { restored: [] };
    }
  }

  function attachEventListeners(): () => void {
    // گوش‌دادن به درخواست تبلیغ از game-board/meta-retention (از طریق EventBus،
    // نه import مستقیم UI از UI — قرارداد §5).
    const off = bus.on('reward_ad_requested', (e) => {
      void showRewardedAd(e.placement);
    });
    return off;
  }

  return {
    isGolden(): boolean {
      return readIapState(storage).owned.includes('golden');
    },
    ownsSku(sku: Sku): boolean {
      return readIapState(storage).owned.includes(sku);
    },
    showRewardedAd,
    purchase,
    restorePurchases,
    adPlacementsHidden(): boolean {
      return shouldHideAdPlacements(storage);
    },
    attachEventListeners,
  };
}
