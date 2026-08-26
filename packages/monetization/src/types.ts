/**
 * @dordaneh/monetization — تایپ‌های داخلی پکیج (مالک: AI-11).
 * قرارداد عمومی (`MonetizationApi`) از @dordaneh/contracts می‌آید — اینجا فقط
 * تایپ‌های درونیِ معماری آداپتور و تزریق وابستگی تعریف می‌شود.
 */

import type {
  AnalyticsApi,
  EventBus,
  RewardedPlacement,
  RewardedResult,
  PurchaseResult,
  Sku,
  StorageApi,
} from '@dordaneh/contracts';

/** رسید خرید — برای صحت‌سنجی سمت سرور بازار/مایکت آماده نگه می‌داریم. */
export interface PurchaseReceipt {
  sku: Sku;
  /** توکن خرید برگشتی از استور (در mock: 'mock-token') */
  purchaseToken: string;
  provider: ProviderId;
  purchasedAt: number; // epoch ms
  /** آیا سرور صحت رسید را تأیید کرده؟ (آفلاین-اول: خرید خوش‌بینانه اعمال می‌شود) */
  verified: boolean;
}

/** وضعیت پایدار مونتیزیشن — تنها در کلید رزروشده‌ی `dor.iap` ذخیره می‌شود. */
export interface IapState {
  /** SKUهای تحت مالکیت */
  owned: Sku[];
  /** رسیدها برای صحت‌سنجی/بازگردانی */
  receipts: PurchaseReceipt[];
  /** شمارنده‌ی تبلیغ جایزه‌ای روزانه (تاریخ به وقت Asia/Tehran) */
  ads: { date: string; count: number };
  /** آخرین نمایش پیشنهاد طلایی — برای frequency cap (بدون مزاحمت) */
  offer?: { lastShownAt: number; count: number };
}

export type ProviderId = 'mock' | 'tapsell' | 'bazaar' | 'myket';

/**
 * آداپتور تبلیغ جایزه‌ای — تنها نوع تبلیغ مجاز کل محصول.
 * پیاده‌سازی native (تپسل) با «بارگذاری دینامیک» از پل Capacitor انجام می‌شود
 * (پلاگین در `native/` مال AI-14 است — interface پل در README همین پکیج).
 */
export interface AdProvider {
  readonly id: ProviderId;
  /** آیا موجودی تبلیغ آماده‌ی نمایش داریم؟ (پیش‌بارگذاری) */
  isReady(placement: RewardedPlacement): Promise<boolean>;
  /** نمایش تبلیغ — فقط پس از رضایت صریح کاربر صدا زده می‌شود. */
  show(placement: RewardedPlacement): Promise<RewardedResult>;
}

/** آداپتور خرید درون‌برنامه (بازار/مایکت/mock). */
export interface IapProvider {
  readonly id: ProviderId;
  purchase(sku: Sku): Promise<{ result: PurchaseResult; purchaseToken?: string }>;
  /** بازگردانی خریدهای قبلی کاربر (پس از نصب مجدد). */
  restore(): Promise<{ sku: Sku; purchaseToken: string }[]>;
}

/** نمایش‌دهنده‌ی پیش‌مودال رضایت — UI شفاف «تماشای ویدئو = ۱ راهنما — قبوله؟» */
export type ConsentPresenter = (placement: RewardedPlacement) => Promise<boolean>;

/** وابستگی‌های تزریقی کنترلر — همه از قراردادها؛ تست‌پذیری کامل. */
export interface MonetizationDeps {
  storage: StorageApi;
  bus: EventBus;
  /** فقط برای getRemoteConfig (قیمت/A-B) — track را app-shell wire می‌کند. */
  analytics?: Pick<AnalyticsApi, 'getRemoteConfig'>;
  adProvider?: AdProvider;
  iapProvider?: IapProvider;
  /** پیش‌مودال رضایت؛ پیش‌فرض: مودال UI خود پکیج (در محیط بدون DOM: رد). */
  presentConsent?: ConsentPresenter;
  /** ساعت تزریقی برای تست‌های قطعی */
  now?: () => number;
}

/** سقف روزانه‌ی تبلیغ جایزه‌ای — کمیابی پاداش ارزشش را نگه می‌دارد (اشباع پاداش). */
export const DAILY_REWARDED_AD_CAP = 3;
