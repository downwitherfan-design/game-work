# 📐 طرح سنجش (Measurement Plan) — دُردانه

> مالک: AI-12 (`packages/analytics/`) — نسخه ۱.۰
> اصل حاکم: «با داده رشد کن» + خط قرمز ۲۸ (صفر PII — همه‌ی رویدادها ناشناس با anonId محلی).
> چارچوب: Lean Analytics (Croll & Yoskovitz, 2013) — **«یک متریک مهم در هر مرحله» (OMTM)**.

## ⭐ متریک ستاره‌ی شمالی فعلی: **D1 Retention**

تا وقتی D1 > ۴۰٪ تثبیت نشود، هیچ متریک دیگری اولویت تصمیم‌گیری ندارد
(فاز MVP = مرحله‌ی Stickiness در Lean Analytics).

---

## ۱) واژه‌نامه‌ی داده

| مفهوم | تعریف دقیق |
|---|---|
| **کاربر** | یک `anonId` یکتا (UUIDv4 محلی — خط قرمز ۱۴، بدون ثبت‌نام) |
| **جلسه** | یک `sessionId` (هر ساخت instance آنالیتیکس = یک جلسه) |
| **روز فعال** | روزی (Asia/Tehran، هم‌راستا با puzzleNumber قرارداد §0) که کاربر حداقل یک `screen_viewed` بفرستد |
| **نصب** | اولین روزی که anonId دیده می‌شود؛ کوهورت = `meta.installWeek` (قالب `YYYY-Www`) |
| **رکورد سیمی** | `{ event, payload, meta:{anonId, sessionId, appVersion, platform, locale, installWeek, seq}, ts }` |

## ۲) KPIهای سند راهبردی

### KPI-1: Retention D1 / D7 ⭐
- **هدف:** D1 > ۴۰٪ (معیار خروج فاز ۲) · D7 > ۲۰٪ (معیار خروج فاز ۴)
- **رویدادها:** `screen_viewed` روزانه + `meta.anonId`
- **فرمول:**
  `D1 = |کاربرانی که در روز نصب+1 فعال‌اند| ÷ |کاربران نصب‌شده در روز مبنا|`
  `D7` همان با آفست ۷ روز. روز = روز تقویمی Asia/Tehran (نه بازه‌ی ۲۴ساعته‌ی شناور).
- **برش‌ها:** `installWeek` (کوهورت هفتگی)، `appVersion`، `platform`.

### KPI-2: قیف حلقه‌ی اصلی
```
puzzle_started → guess_submitted → puzzle_finished → card_revealed
              → share_initiated → share_completed
```
- **نرخ هر پله:** `|کاربران یکتای پله‌ی n+1| ÷ |کاربران یکتای پله‌ی n|` در همان روز/puzzleNumber.
- **نرخ اشتراک (هدف > ۱۵٪، معیار خروج فاز ۳):**
  `share_rate = |anonId یکتا با share_completed| ÷ |anonId یکتا با puzzle_finished|` (روزانه).
- **نرخ تکمیل اشتراک:** `share_completed ÷ share_initiated` — افت زیاد = اصطکاک در Share Sheet.
- برش `surface` (`result`/`card`/`streak`/`duel`) نشان می‌دهد کدام سطح وایرال‌تر است (Berger, *Contagious*, 2013).

### KPI-3: زمان تا اولین برد (آنبوردینگ)
- **هدف:** < ۳۰ ثانیه (خط قرمز ۱۷؛ Bandura 1977 — خودکارآمدی).
- **رویدادها:** اولین `puzzle_finished` با `won=true` هر anonId.
- **فرمول:** `median(durationMs)` روی اولین برد هر کاربر؛ گزارش p50/p90.
  (میانه، نه میانگین — توزیع زمان چوله است.)

### KPI-4: توزیع guessCount (سلامت سختی کلمات → بازخورد به AI-02)
- **رویدادها:** `puzzle_finished` با `puzzleId='daily-<n>'`.
- **فرمول‌ها (پیاده‌شده در `src/word-health.ts`):**
  - `avgGuessCount(n) = mean(guessCount | won=true)` — بازنده همیشه ۶ حدس مصرف می‌کند و میانگین را مخدوش می‌کند.
  - `lossRate(n) = 1 − wins ÷ plays`
  - **پرچم‌ها:** `lossRate > 40٪` → 🔴 `very_hard` (ریسک churn روزانه) · `lossRate > 25٪` یا `avgGuess > 5` → 🟡 `hard`
- **خروجی:** گزارش هفتگی Markdown (`renderWordHealthReport`) برای AI-02 — حلقه‌ی PDCA (Deming).

### KPI-5: اقتصاد و ریتنشن‌افزارها
| متریک | فرمول | رویدادها |
|---|---|---|
| نرخ مصرف فریز | `streak_changed(frozen=true)` یکتا ÷ کاربران دارای استریک ≥ ۱ | `streak_changed` |
| نرخ تبدیل rewarded | `reward_ad_completed ÷ reward_ad_requested` (برش `placement`) | `reward_ad_*` |
| نرخ تبدیل طلایی | anonId یکتا با `purchase_completed(sku='golden')` ÷ کاربران فعال ۷روزه | `purchase_completed` |

## ۳) کوهورت هفتگی (بدون ابزار سنگین)
هر رویداد `meta.installWeek` دارد (در نصب قفل می‌شود). مقایسه‌ی D1/D7 بین
هفته‌های نصب = اثر نسخه‌ها/تغییرات، با SQL ساده روی رکوردهای سیمی — بدون BI سنگین.

## ۴) آزمایش‌های A/B روز اول (`src/experiments.ts`)
| آزمایش | شناسه | فرضیه | متریک تصمیم |
|---|---|---|---|
| متن CTA اشتراک | `share_cta_text_v1` | CTA چالشی > CTA خنثی | `share_rate` |
| ساعت پیش‌فرض نوتیف | `notif_default_hour_v1` | ۱۹ عصر > ۹ صبح | `retention_d1` |

- بکتینگ: `FNV-1a(anonId + ':' + experimentId) % 2` — قطعی، بدون سرور، ۵۰/۵۰ پایدار.
- exposure: رویداد `experiment_exposed {experimentId, variant}` یک‌بار در جلسه.
  ⚠️ این رویداد هنوز در `AppEvent` قرارداد نیست → **RFC-0012**؛ تا تأیید، در قالب سیمی ژنریک ارسال می‌شود (سازگار با endpoint).
- قاعده‌ی توقف: حداقل یک هفته‌ی کامل + ~۱۰۰۰ کاربر در هر بازو قبل از قضاوت (نویز روز هفته).

## ۵) لوله‌ی داده (Pipeline)
```
EventBus ──wireAnalyticsToBus──▶ track()
  → غنی‌سازی متادیتای ناشناس (anonId/sessionId/appVersion/platform/locale/installWeek/seq)
  → گارد ضد-PII (sanitizePayload — خط قرمز ۲۸)
  → صف آفلاین Storage['dor.analytics.queue'] (سقف ۵۰۰، FIFO)
  → flush: هر ۲۰ رویداد | هر ۳۰ ثانیه | visibilitychange(hidden)
  → آداپتور: sendBeacon → fetch(keepalive) → console(dev) / noop(بدون endpoint)
```
- endpoint با env: `VITE_ANALYTICS_ENDPOINT` (قالب: `POST /events` با بدنه‌ی `{events: WireEvent[]}`) — سرور نزد AI-09 (در نبودش آداپتور noop؛ رسمی‌سازی مسیر در صورت نیاز با RFC).
- remote config: `VITE_ANALYTICS_CONFIG_URL` → JSON استاتیک نسخه‌دار، کش ۲۴ساعته، **همیشه fallback sync** — اپ هرگز منتظر config نمی‌ماند (آفلاین-اول، خط قرمز ۱۸).

## ۶) حریم خصوصی (خط قرمز ۲۸ — غیرقابل مذاکره)
- ❌ هرگز: ایمیل، شماره، مخاطبین، موقعیت، IP، نام واقعی، هیچ شناسه‌ی دستگاهی.
- ✅ فقط: رویدادهای گیم‌پلی ناشناس + متادیتای فنی (نسخه/پلتفرم/locale).
- دفاع در عمق: `sanitizePayload` فیلدهای PII را به نام حذف و مقادیر شبیه ایمیل/موبایل را redact می‌کند؛ تست صریح DoD در `test/privacy.test.ts`.
- بودجه‌ی حجم: کل پکیج ≤ ۵KB gzip (Doherty 1982 — آنالیتیکس نباید تجربه را کند کند).
