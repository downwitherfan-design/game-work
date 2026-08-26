/**
 * @dordaneh/monetization — درآمد اخلاقی (مالک: AI-11).
 * پیاده‌سازی MonetizationApi قرارداد (docs/02_CONTRACTS.md §10).
 *
 * فلسفه‌ی قطعی: درآمد از رضایت، نه از اذیت.
 *  ⛔ هرگز pay-to-win ⛔ هرگز تبلیغ اجباری ⛔ هرگز تبلیغ در جلسه‌ی اول
 *  ⛔ هرگز dark pattern
 */

// کنترلر اصلی (MonetizationApi + رویدادها)
export { createMonetization, type MonetizationController } from './controller';

// سیاست تبلیغ (سقف ۳/روز، جلسه‌ی اول، کاربر طلایی)
export {
  checkAdEligibility,
  adsRemainingToday,
  adsWatchedToday,
  isFirstSession,
  shouldHideAdPlacements,
  tehranDateKey,
  type AdEligibility,
} from './ad-policy';

// وضعیت مالکیت (dor.iap) + صحت‌سنجی رسید
export {
  readIapState,
  writeIapState,
  grantSku,
  verifyReceipt,
  emptyIapState,
  isKnownSku,
} from './iap-state';

// کاتالوگ و قیمت (remote config)
export { CATALOG, getCatalogItem, getPriceToman, type CatalogItem, type SkuKind } from './catalog';

// لحظه‌های پیشنهاد طلایی (Peak-End)
export {
  attachOfferMoments,
  canShowOffer,
  recordOfferShown,
  DEFAULT_OFFER_CONFIG,
  type OfferTrigger,
  type OfferMomentConfig,
  type ShowOfferFn,
} from './offer-moments';

// Providerها (معماری آداپتور)
export { createMockAdProvider, createMockIapProvider } from './providers/mock';
export { createTapsellAdProvider, type TapsellZoneConfig } from './providers/tapsell';
export { createBazaarIapProvider } from './providers/bazaar-iap';
export { createMyketIapProvider } from './providers/myket-iap';
export {
  selectAdProvider,
  selectIapProvider,
  activeProviderIds,
  detectEnv,
  isNativeAndroid,
  type PlatformEnv,
} from './providers/select';
export {
  getNativeBridge,
  type DordanehNativeBridge,
  type TapsellBridge,
  type IapBridge,
} from './providers/native-bridge';

// UI — ShopScreen (route /shop) و مودال رضایت
export {
  mountShopScreen,
  buildShopVNode,
  formatPrice,
  type ShopScreenDeps,
  type ShopScreenHandle,
} from './ui/shop-screen';
export { createDomConsentPresenter, buildConsentVNode } from './ui/consent-modal';
export { ensureStylesInjected, MONETIZATION_CSS } from './ui/styles';

// تایپ‌های عمومی معماری
export {
  DAILY_REWARDED_AD_CAP,
  type AdProvider,
  type IapProvider,
  type ConsentPresenter,
  type MonetizationDeps,
  type IapState,
  type PurchaseReceipt,
  type ProviderId,
} from './types';
