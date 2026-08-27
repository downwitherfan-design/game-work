# @dordaneh/app-shell — پوسته‌ی اپ، ناوبری، استیت (مالک: AI-05)

پوسته‌ی اپ «دُردانه» و **تنها نقطه‌ی مونتاژ نهایی** پروژه: همه‌ی ماژول‌های ۱۵ AI
این‌جا به هم وصل می‌شوند. app-shell «چسب» است، نه سازنده‌ی فیچر.

## ✅ قابلیت‌های پیاده‌شده

| بخش | توضیح | فایل |
|---|---|---|
| EventBus | نمونه‌ی واحد از پیاده‌سازی مرجع قرارداد §5 (typed + unsubscribe) | `src/core/bus.ts` |
| StorageApi | localStorage (وب) + آداپتور Capacitor Preferences (native) با تشخیص خودکار محیط و hydrate | `src/core/storage.ts` |
| روتینگ | جدول §6: `/`، `/practice`، `/stats`، `/album`، `/duel/*`، `/shop`، `/settings` — همه lazy (preact-iso) | `src/app/App.tsx` |
| تم | light/dark/auto (پیش‌فرض prefers-color-scheme) + کوررنگی روی `data-theme`/`data-colorblind` | `src/core/theme.ts` |
| آنبوردینگ | «پیروزی ۳۰ ثانیه‌ای»: بدون فرم → `getOnboardingPuzzle()` + ۲ tooltip → پیروزی → کارت فرهنگی → Peak-End | `src/app/Onboarding.tsx` |
| تنظیمات | تم، کوررنگی، صدا/موسیقی/هپتیک (AudioApi)، یادآور، زبان (fa)، درباره، حریم خصوصی | `src/app/Settings.tsx` |
| Wiring آنالیتیکس | تنها نقطه‌ی اتصال `AnalyticsApi.track` به EventBus (§8) | `src/services/orchestrator.ts` |
| ارکستراسیون پس از حل | `puzzle_finished` → کارت فرهنگی → استریک → پیشنهاد اشتراک (فقط ترتیب؛ UI مال مالکان) | `src/services/orchestrator.ts` |
| PWA | manifest + service worker با precache (آفلاین-اول، خط قرمز ۱۸) | `public/sw.js` |
| بازیابی جلسه | معمای نیمه‌کاره در Storage؛ بنر «ادامه بده» (Hooked/Eyal 2014) | orchestrator + `ResumeBanner` |
| پیش‌بارگذاری idle | stats/album پس از بوت در `requestIdleCallback` (Doherty 1982) | `src/app/screens.ts` |
| بج آلبوم | «۱» طلایی روی تب گنجینه با کشف کارت تازه (زایگارنیک ۱۹۲۷) | `BottomNav` |
| i18n | همه‌ی متن‌ها از `locales/fa.json` با پیشوند `appShell.` (§11) | `src/core/i18n.ts` |

## 🔁 قانون mock (حیاتی برای موازی‌کاری)

از هر پکیج فقط **entry point رسمی** (`@dordaneh/<pkg>`) import می‌شود. اگر export
قراردادی هنوز موجود نباشد، **خودکار** به mock قراردادی `src/mocks/` سوییچ می‌شود
(`src/services/registry.ts` و `src/app/screens.ts`). به‌محض این‌که AI مالک، export
قراردادی‌اش را publish کند (مثلاً `GameScreen` یا `createEngine`)، بدون هیچ تغییری
در app-shell نسخه‌ی واقعی جایگزین می‌شود. فلگ‌های `mockFlags` برای دیباگ.

- Mock صفحه‌ها: `MockGameScreen`، `MockStatsScreen`، `MockAlbumScreen`، `MockDuelScreen`، `MockShopScreen`
- Mock سرویس‌ها: `EngineApi`، `CultureApi`، `AudioApi`، `AnalyticsApi`، `MonetizationApi`، `ShareApi`
- Mock توکن‌های ui-kit: فقط اگر `--dor-bg` تعریف نشده باشد تزریق می‌شود

## 🧪 وضعیت کیفیت

- ۶۵ تست، پوشش منطق **≈۹۵٪** (هدف DoD ≥ ۸۰٪) — EventBus/Storage/theme/orchestrator/mocks/resolver
- باندل: **~۱۷KB gzip** (JS) + ~۱.۲KB CSS — بسیار زیر بودجه‌ی ۱۵۰KB (خط قرمز ۲۳)
- تست دود مرورگر: بوت، آنبوردینگ و رندر بدون خطای کنسول
- کامپوننت‌های .tsx با E2E در `qa/` (مالک AI-15) پوشش داده می‌شوند

## 🚀 اجرا

```bash
npm run build -w @dordaneh/app-shell   # tsc --noEmit + vite build → dist/
npm test  -w @dordaneh/app-shell       # vitest + coverage
npm run dev -w @dordaneh/app-shell     # dev server محلی
```

## 📌 وابستگی‌ها

`preact` + `preact-iso` (مجاز طبق پرامپت AI-05). ثبت در lock-file ریشه: **RFC-0001**
(lock-file فقط مال AI-14 است — خط قرمز ۳).

## 🗺️ گام‌های بعدی

- اتصال خودکار پکیج‌های واقعی به‌محض publish شدن exportهای قراردادی (بدون تغییر کد)
- یادآور روزانه: فراخوانی API نوتیفیکیشن meta-retention وقتی قراردادش export شد
- سوییچ SW به precache کامل هش‌دار (فهرست assets از manifest بیلد) نزدیک انتشار
