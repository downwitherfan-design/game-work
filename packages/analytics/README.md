# @dordaneh/analytics — رصد داده و رشد (مالک: AI-12)

پیاده‌سازی `AnalyticsApi` قرارداد (docs/02_CONTRACTS.md §8) — «با داده رشد کن»،
اما **حریم خصوصی اول** (خط قرمز ۲۸: صفر PII). صفر وابستگی (فقط `@dordaneh/contracts`؛
fetch/sendBeacon بومی). بودجه‌ی حجم: ≤ ۵KB gzip.

## قابلیت‌ها

- **`track(e: AppEvent)`** — غنی‌سازی با متادیتای ناشناس (anonId، sessionId، appVersion،
  platform، locale، installWeek، seq) → گارد ضد-PII → صف آفلاین در
  `Storage['dor.analytics.queue']` → ارسال دسته‌ای (۲۰ رویداد / ۳۰ ثانیه /
  `visibilitychange`) با `navigator.sendBeacon` و فالبک `fetch(keepalive)`.
  شکست شبکه = ماندن در صف (سقف ۵۰۰، FIFO). هیچ خطایی به اپ نشت نمی‌کند.
- **`getRemoteConfig<T>(key, fallback)`** — JSON استاتیک نسخه‌دار + کش ۲۴ساعته +
  **همیشه fallback sync** (اپ هرگز منتظر config نمی‌ماند — آفلاین-اول).
- **`getVariant(experimentId)`** — A/B قطعی بدون سرور: `FNV-1a(anonId+':'+expId) % 2`،
  توزیع ۵۰/۵۰ پایدار + ثبت خودکار `experiment_exposed` (تا تأیید RFC-0012 در قالب سیمی ژنریک).
- **سلامت کلمه** — `aggregateWordHealth` + `renderWordHealthReport`: گزارش هفتگی md
  برای AI-02 (میانگین حدس/نرخ باخت هر puzzleNumber، پرچم `hard`/`very_hard`).
- **کوهورت هفتگی** — برچسب `installWeek` (`YYYY-Www`) در متادیتای هر رویداد.

## استفاده (فقط app-shell — قرارداد §8)

```ts
import { createAnalytics, wireAnalyticsToBus } from '@dordaneh/analytics';

const analytics = createAnalytics({ storage }); // StorageApi قرارداد
const unwire = wireAnalyticsToBus(bus, analytics); // مصرف از EventBus

// A/B روز اول:
import { resolveExperiment, EXP_SHARE_CTA } from '@dordaneh/analytics';
const shareCta = resolveExperiment(analytics, EXP_SHARE_CTA);
```

هیچ پکیج دیگری نباید مستقیم analytics را صدا بزند — رویدادها از EventBus می‌آیند.

## پیکربندی (env)

| متغیر | نقش | پیش‌فرض |
|---|---|---|
| `VITE_ANALYTICS_ENDPOINT` | مقصد `POST /events` (بدنه: `{events: WireEvent[]}`) | — (dev: console، تولید بدون endpoint: noop خنثی) |
| `VITE_ANALYTICS_CONFIG_URL` | JSON استاتیک نسخه‌دار remote config | — (همیشه fallback) |
| `VITE_APP_VERSION` | نسخه‌ی اپ در متادیتا | `0.0.0` |

## اسناد

- 📐 طرح سنجش کامل (KPIها، فرمول‌ها، قیف، A/B): [`docs-metrics.md`](./docs-metrics.md)
- 📄 RFC رویداد exposure: `docs/rfcs/RFC-0012-experiment-exposed-event.md`

## تست

```bash
npm test -w @dordaneh/analytics   # vitest + coverage (آستانه ≥ ۸۰٪)
```

شامل تست صریح DoD ضد-PII: هیچ رکورد صف‌شده‌ای فیلد شخصی ندارد (`test/privacy.test.ts`).
