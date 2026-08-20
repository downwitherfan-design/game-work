# @dordaneh/monetization — درآمد اخلاقی (مالک: AI-11)

پیاده‌سازی `MonetizationApi` قرارداد (`docs/02_CONTRACTS.md` §10).

> **فلسفه‌ی قطعی: درآمد از رضایت، نه از اذیت.**
> ⛔ هرگز pay-to-win ⛔ هرگز تبلیغ اجباری/بنری ⛔ هرگز تبلیغ در جلسه‌ی اول ⛔ هرگز dark pattern

---

## معماری

```
src/
├── controller.ts        ← createMonetization(deps) → MonetizationApi + extras
├── ad-policy.ts         ← سیاست اخلاقی: جلسه‌ی اول، سقف ۳/روز (تهران)، کاربر طلایی
├── iap-state.ts         ← وضعیت مالکیت روی StorageApi (کلید dor.iap) + verifyReceipt
├── catalog.ts           ← ۶ SKU قرارداد + قیمت از remote config (فالبک آفلاین)
├── offer-moments.ts     ← پیشنهاد طلایی فقط در peak ارزش (Peak-End) + frequency cap
├── providers/
│   ├── mock.ts          ← وب/dev: همیشه rewarded/ok (قرارداد §10)
│   ├── native-bridge.ts ← قرارداد پل Capacitor (globalThis.DordanehNative)
│   ├── tapsell.ts       ← آداپتور Rewarded تپسل (بارگذاری دینامیک — بدون import SDK)
│   ├── bazaar-iap.ts    ← آداپتور IAP کافه‌بازار
│   ├── myket-iap.ts     ← آداپتور IAP مایکت
│   └── select.ts        ← انتخاب provider با env/platform detection
└── ui/
    ├── shop-screen.ts   ← ShopScreen (route /shop) + بازگردانی خرید
    ├── consent-modal.ts ← پیش‌مودال شفاف رضایت تبلیغ
    ├── styles.ts        ← CSS فقط از توکن‌های ui-kit (بدون hex)
    └── vdom.ts          ← VDOM داخلی موقت (تا تأیید RFC-0001-dep-preact)
```

## استفاده (wiring در app-shell — AI-05)

```ts
import {
  createMonetization, mountShopScreen, createDomConsentPresenter,
  attachOfferMoments, selectAdProvider, selectIapProvider,
} from '@dordaneh/monetization';

const monetization = createMonetization({
  storage,                 // StorageApi (localStorage/Capacitor Preferences)
  bus,                     // EventBus سراسری
  analytics,               // فقط getRemoteConfig (قیمت‌ها)
  adProvider: selectAdProvider(),    // وب→mock، اندروید+پل→tapsell
  iapProvider: selectIapProvider(),  // فلاور bazaar/myket از env
  presentConsent: createDomConsentPresenter(storage, t),
});

// wiring رویداد reward_ad_requested (از game-board/meta-retention)
const detach = monetization.attachEventListeners();

// لحظه‌های پیشنهاد طلایی (streak_changed) — نمایش با UI ملایم app-shell
attachOfferMoments(storage, bus, (trigger) => {
  // بنر/شیت پایین غیرمسدودکننده — هرگز مودال وسط بازی
});

// route /shop:
mountShopScreen(container, { monetization, t, analytics });
```

### قواعد مصرف برای game-board (AI-06) و meta-retention (AI-08)
- قبل از رندر دکمه‌های «راهنما با ویدئو»/«حدس اضافه با ویدئو»:
  `monetization.adPlacementsHidden()` را چک کنید — اگر `true`، placement را **اصلاً رندر نکنید**
  (جلسه‌ی اول یا کاربر طلایی).
- برای درخواست تبلیغ فقط `bus.emit({ type: 'reward_ad_requested', placement })` بزنید؛
  در صورت پاداش، رویداد `reward_ad_completed` برمی‌گردد.

## 🔌 قرارداد پل native — Wiring برای AI-14

SDK های تپسل/بازار/مایکت **هرگز در این پکیج import نمی‌شوند** (بودجه‌ی حجم + مرز مالکیت).
پلاگین Capacitor (در `native/`، مالک: AI-14) باید این شیء را روی `globalThis` تزریق کند:

```ts
globalThis.DordanehNative = {
  // تپسل — Rewarded فقط (تنها نوع تبلیغ مجاز کل محصول)
  tapsell: {
    isRewardedReady(zoneId: string): Promise<boolean>,
    // نگاشت نتیجه‌ی SDK: پاداش کامل→'rewarded'، بستن زودهنگام→'skipped'، خطا/عدم موجودی→'unavailable'
    showRewarded(zoneId: string): Promise<'rewarded'|'skipped'|'unavailable'>,
  },
  // بازار (Poolakey) — فقط در فلاور bazaar
  bazaarIap: {
    purchase(sku: string): Promise<{ result: 'ok'|'cancelled'|'error'; purchaseToken?: string }>,
    getPurchases(): Promise<{ sku: string; purchaseToken: string }[]>,  // برای بازگردانی خرید
  },
  // مایکت — فقط در فلاور myket (همان interface)
  myketIap: { purchase(...), getPurchases(...) },
};
```

**env بیلد** (تزریق توسط AI-14 در بیلد وب/native):
```ts
globalThis.__DOR_ENV__ = {
  storeFlavor: 'bazaar' | 'myket',  // فلاور استور
  forceMock: boolean,                // dev/test → همیشه mock
};
```

**zoneId های تپسل**: از env بیلد native (هرگز در ریپو — خط قرمز ۱۱).
مقادیر placeholder در `providers/tapsell.ts` با `createTapsellAdProvider({ extra_guess, hint })` جایگزین می‌شوند.

**نگاشت SKU در استورها**: شناسه‌ی محصول در پنل بازار/مایکت باید دقیقاً برابر `Sku` قرارداد باشد
(`golden`, `pack_cooking`, `pack_cinema`, `pack_sport`, `pack_classic`, `theme_pack_1`).

**صحت‌سنجی رسید**: `verifyReceipt(storage, receipt, verifier)` آماده است؛ `verifier` بعداً به
endpoint سرور بازار (از طریق backend-api، پس از RFC) وصل می‌شود. خطای شبکه هرگز مالکیت را پس نمی‌گیرد.

## قواعد اخلاقی پیاده‌سازی‌شده (تست‌شده)

| قاعده | مکانیزم | تست |
|---|---|---|
| صفر تبلیغ در جلسه‌ی اول | فلگ آنبوردینگ از `dor.profile`؛ ابهام → جلسه‌ی اول فرض می‌شود | `consent-first-session.test.ts` |
| سقف ۳ تبلیغ/روز | شمارنده در `dor.iap` با تاریخ Asia/Tehran | `ad-policy.test.ts` |
| رضایت صریح | پیش‌مودال با دو دکمه‌ی هم‌وزن؛ backdrop = رد؛ رد = بدون مصرف سقف | `consent-first-session.test.ts` |
| طلایی = بدون تبلیغ | eligibility + `adPlacementsHidden()` | `ad-policy.test.ts` |
| بدون تخفیف جعلی | قیمت مستقیم از remote config؛ تست عدم وجود واژه‌ی «تخفیف» | `shop-ui.test.ts` |
| پیشنهاد فقط در peak ارزش | trigger: مصرف فریز / استریک ۱۴؛ cap: ۷ روز فاصله، ۳ بار عمر | `offer-moments.test.ts` |
| هرگز pay-to-win | کاتالوگ فقط `golden|content|cosmetic` — تست ساختاری | `shop-ui.test.ts` |

## ذخیره‌سازی (`dor.iap`)

```ts
{ owned: Sku[], receipts: PurchaseReceipt[],
  ads: { date: 'YYYY-MM-DD', count: number },        // سقف روزانه
  offer?: { lastShownAt: epochMs, count: number } }   // frequency cap پیشنهاد
```

## وضعیت وابستگی‌ها
- فقط `@dordaneh/contracts` (+ تایپ `AnalyticsApi`).
- **preact**: RFC-0001 ثبت شده؛ تا تأیید، VDOM داخلی (~۷۰ خط، تست‌شده) استفاده می‌شود.
  پس از تأیید، `ui/vdom.ts` حذف و `h` از preact می‌آید (ساختار VNode سازگار است).
- ui-kit فعلاً `export {}` است؛ از CSS Variables قراردادش استفاده می‌کنیم. وقتی کامپوننت‌ها
  (Button/Modal/Toast) صادر شدند، UI به آن‌ها مهاجرت می‌کند.

## تست و کیفیت
- `npm test -w @dordaneh/monetization` → ۷۵ تست، پوشش ~۹۶٪ (آستانه‌ی CI: ۸۰٪).
- باندل: صفر وابستگی خارجی؛ کل src گزیپ‌شده ≪ ۱۵۰KB (بودجه‌ی خط قرمز ۲۳).
