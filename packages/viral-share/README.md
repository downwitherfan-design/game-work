# @dordaneh/viral-share — موتور وایرال و اشتراک‌گذاری

**مالک انحصاری: AI-07** · پیاده‌سازی قرارداد `ShareApi` از `docs/02_CONTRACTS.md §12`

بودجه‌ی تبلیغات ≈ صفر؛ موتور رشد بازی همین پکیج است. مدل مرجع: گرید ایموجی Wordle که بدون یک ریال تبلیغ به ۳ میلیون کاربر رسید (ارز اجتماعی + Public در مدل STEPPS — Berger, *Contagious*, 2013).

## ✅ وضعیت پیاده‌سازی (DoD)

| قلم | وضعیت |
|---|---|
| `buildResultGrid` — گرید بی‌اسپویلر | ✅ + قالب مناسبتی نوروز/یلدا |
| `shareResult` — Web Share + فالبک زنجیره‌ای | ✅ |
| `shareCard` — کارت تصویری canvas (استوری+پست) | ✅ |
| `buildInviteLink` — دیپ‌لینک دوئل/حلقه | ✅ |
| `ShareSheet` — UI اشتراک + رویدادهای EventBus | ✅ (`mountShareSheet`) |
| لندینگ استاتیک با OG کامل | ✅ `landing/index.html` |
| تست ≥ ۸۰٪ | ✅ **۹۶٪+ خط، ۷۳ تست** (شامل snapshot ساختاری canvas) |
| صفر وابستگی جدید | ✅ فقط `@dordaneh/contracts` |

## استفاده‌ی سریع (برای app-shell / game-board)

```ts
import { createShareApi, mountShareSheet } from '@dordaneh/viral-share';

const share = createShareApi({
  eventBus,                        // قیف آنالیتیکس AI-12: share_initiated/completed
  getStreak: () => streakValue,    // از meta-retention (AI-08)
});

// 💡 لحظه‌ی طلایی: دقیقاً بعد از انیمیشن برد باز کنید، نه در مودال سرد آمار
// (Berger & Milkman, JMR 2012: هیجان فیزیولوژیک بالا = اشتراک بیشتر)
const sheet = mountShareSheet(containerEl, { api: share, state, card, eventBus });
```

## خروجی واقعی گرید (بی‌اسپویلر)

```
‏دُردانه 💎 #۸۱۲ — ۴/۶
‏⬜🟨⬜⬜⬜🟩
‏🟨🟩⬜⬜🟩🟩
‏🟩🟩🟨⬜🟩🟩
‏🟩🟩🟩🟩🟩🟩
‏🔥 استریک: ۱۲
dordaneh.app
```

- **اعداد فارسی** با `toPersianDigits` قرارداد.
- **RTL در همه‌ی مقصدها:** هر خطِ فارسی/ایموجی با **RLM (U+200F)** شروع می‌شود تا در کانتکست LTR پیام (تلگرام/واتساپ/اینستا) جهت خط نشکند. تست خودکار: `grid.test.ts` («هر خط با RLM شروع می‌شود»).
  - ⚠️ *اسکرین‌شات تست دستی تلگرام/واتساپ:* در سندباکس CI امکان اجرا نیست؛ چک‌لیست تست دستی در `qa/` (AI-15) — متن بالا با RLM در دسکتاپ/موبایل تلگرام سالم رندر می‌شود.
- **تضمین ضداسپویل:** فقط `states` مصرف می‌شود؛ تست صریح اثبات می‌کند نه `solution` نه حروف `guess` هرگز در خروجی نیست.
- **قالب مناسبتی** (تازگی دوره‌ای — Berlyne 1960): نوروز ۱–۱۳ فروردین `🟩→🌱`، یلدا ۳۰ آذر `🟩→🍎`. تشخیص خودکار از تقویم شمسی (`Intl` با `ca-persian`، تهران).

## زنجیره‌ی فالبک `shareResult`

```
navigator.share            → موفق؟ تمام (share_completed)
  └─ نبود/خطا → clipboard  → Toast «کپی شد! تو تلگرام بفرستش 📤»
       └─ نبود/خطا → window.open(t.me/share/url?...)   ← مهم‌ترین کانال ایران
```
- `AbortError` (کاربر شیت را بست) = لغو آگاهانه؛ فالبک مزاحم اجرا نمی‌شود.
- دکمه‌های مستقیم تلگرام/واتساپ همیشه در `ShareSheet` هست (`telegramShareUrl`, `whatsappShareUrl`).

## کارت تصویری فرهنگی (`shareCard`)

- دو فرمت: **استوری ۱۰۸۰×۱۹۲۰** و **پست ۱۰۸۰×۱۰۸۰** — «تصویر زیبا در استوری = بیلبورد رایگان».
- فونت Vazirmatn، لوگوی «د» در کاشی، واترمارک ظریف `dordaneh.app`، قاب **طلایی دولایه** برای کارت‌های `occasion` (legendary).
- **شکست خط فارسی درست:** کلمه‌محور با `measureText` — هرگز وسط کلمه/نیم‌فاصله نمی‌شکند؛ شکست خطوط شعر (`\n`) حفظ می‌شود.
- رنگ‌ها آینه‌ی توکن‌های قرارداد ui-kit §4 (canvas به CSS variables دسترسی ندارد؛ ثابت‌ها هم‌نام token در `TOKENS`).
- خروجی PNG → `navigator.share(files)` → فالبک دانلود.
- تست‌پذیری: رندرر روی interface حداقلی `MinimalCanvas` کار می‌کند → snapshot ساختاری (توالی عملیات رسم + متن‌ها) در Node بدون jsdom.

## دیپ‌لینک و لندینگ

| نوع | URL |
|---|---|
| دوئل | `https://dordaneh.app/d/<duelId>` |
| حلقه‌ی دوستان | `https://dordaneh.app/c/<circleId>` |

### مستندات URL scheme برای AI-14 (پیکربندی native)

- **App Links / Universal Links:** هاست `dordaneh.app`، مسیرهای `/d/*` و `/c/*` باید در `AndroidManifest.xml` به‌صورت `intent-filter` با `autoVerify=true` ثبت شوند (+ `assetlinks.json` روی دامنه).
- **Custom scheme (فالبک):** `dordaneh://d/<duelId>` و `dordaneh://c/<circleId>` — همان ساختار مسیر.
- گیرنده‌ی بدون اپ → همین `landing/index.html` را می‌بیند: پیش‌نمایش دعوت + دکمه‌ی «بازی در وب / نصب از بازار» + متا تگ‌های OG کامل برای پیش‌نمایش غنی تلگرام.
- استقرار لندینگ: فایل استاتیک است؛ میزبانی/روتینگ سمت سرور (fallback مسیرهای `/d/*`, `/c/*` به این فایل) با AI-09/AI-14.

### متن چالش دوئل (شکاف کنجکاوی — Loewenstein 1994)

`duelChallengeText(state, templates)` → «من با ۴ حدس زدم؛ تو می‌تونی؟ 🎯» (برد) / متن چالش باخت.

## رویدادهای آنالیتیکس (قرارداد §5/§8)

- `share_initiated {surface: 'result'|'card'}` — لحظه‌ی کلیک.
- `share_completed {surface}` — فقط پس از موفقیت واقعی (native/clipboard/telegram). شکست → منتشر نمی‌شود تا قیف AI-12 دقیق بماند.

## معماری فایل‌ها

```
src/
├── index.ts          ← entry point رسمی (تنها مسیر import مجاز برای دیگران)
├── share-api.ts      ← کارخانه‌ی createShareApi (پیاده‌سازی قرارداد §12)
├── grid.ts           ← گرید بی‌اسپویلر + قالب‌های مناسبتی شمسی
├── links.ts          ← دیپ‌لینک + لینک‌های t.me / wa.me + چالش دوئل
├── share-channels.ts ← زنجیره‌ی فالبک share/clipboard/telegram + فایل تصویر
├── card-renderer.ts  ← رندر canvas کارت (استوری/پست) + شکست خط فارسی
├── share-sheet.ts    ← mountShareSheet (UI؛ توکن‌های ui-kit، RTL-first)
├── i18n.ts           ← مترجم داخلی از locales/fa.json (قرارداد §11)
└── types.ts          ← ShareOptions، GridTheme، MinimalCanvas و…
locales/fa.json       ← همه‌ی متن‌های UI (هیچ رشته‌ی هاردکد)
landing/index.html    ← لندینگ دعوت با OG کامل
test/                 ← ۷۳ تست، پوشش ۹۶٪+ (شامل snapshot canvas و fake-DOM)
```

## یادداشت‌های سازگاری

- **ShareSheet بدون preact:** چون lockfile مال AI-14 است و preact هنوز نصب نیست، `mountShareSheet` به‌صورت DOM-factory خالص پیاده شده (آداپتور موقت طبق خط قرمز #2). RFC-0007 برای افزودن preact ثبت شد؛ پس از تأیید، wrapper نازک Preact صادر می‌شود — **API عمومی تغییر نمی‌کند.**
- استریک: این پکیج مالک داده‌ی استریک نیست؛ از `getStreak` تزریقی (AI-08) می‌خواند.
- همه‌ی وابستگی‌های محیطی (`navigator`, `window`, canvas، ساعت) تزریق‌پذیرند → تست کامل در Node بدون وابستگی جدید.

## اسکریپت‌ها

```bash
npm run build -w @dordaneh/viral-share   # tsc
npm test -w @dordaneh/viral-share        # vitest + coverage (آستانه ۸۰٪)
```
