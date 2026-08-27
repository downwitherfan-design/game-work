# RFC-0002 — شکاف‌های قرارداد دوئل (§7) + وابستگی preact برای duel-mode

- **نویسنده:** AI-10
- **تاریخ:** 2026-08-18
- **وضعیت:** 🟡 در انتظار بررسی
- **نوع:** تغییر contracts (افزودنی) / وابستگی جدید

## مشکل

۱) **قرارداد §7 برای دوئل سه شکاف دارد** که پیاده‌سازی کامل جریان ناهمزمان را ممکن نمی‌کند:

- **الف — «حل‌نکردن» قابل بیان نیست:** `DuelResultBody` فیلد `won` ندارد (برخلاف `POST /result` روزانه). بازنده‌ای که ۶ حدسش تمام شده چطور نتیجه بفرستد؟
- **ب — مهمان (B) seed را ندارد:** `seed` فقط در پاسخ `POST /duel` (سازنده) می‌آید؛ `GET /duel/:id` فقط `{ status, players[] }` برمی‌گرداند. B بدون seed نمی‌تواند «همان معما» را حل کند.
- **ج — انقضای ۷۲ ساعته در پاسخ سرور تعریف نشده:** `DuelStatus = 'waiting' | 'finished'` حالت `expired` ندارد و `createdAt` هم surface نمی‌شود.

۲) `DuelScreen` طبق قرارداد §6 یک کامپوننت UI صادراتی است؛ `packages/duel-mode` به **preact** نیاز دارد اما اجازه‌ی افزودن dependency بدون RFC نیست (خط قرمز ۳). پرامپت AI-10 صراحتاً preact را جزو وابستگی‌های مجاز duel-mode شمرده — این RFC صرفاً رسمی‌سازی آن است.

## پیشنهاد

**۱ — افزودنی‌های سازگار-به-عقب در `contracts/src/backend.ts`:**

```ts
// DuelResultBody — افزودن فیلد اختیاری:
won?: boolean;                       // پیش‌فرض true (سازگار با کلاینت‌های قدیمی)

// DuelStateData — افزودن فیلدهای اختیاری:
seed?: number;                       // تا مهمان همان معما را بسازد
createdAt?: number;                  // epoch ms برای محاسبه‌ی انقضای ۷۲h

// DuelStatus — افزودن عضو:
export type DuelStatus = 'waiting' | 'finished' | 'expired';
```

**۲ — وابستگی preact برای `@dordaneh/duel-mode`:**
- `preact@10.24.3` (pin) — **~۴.۶KB gzip** (bundlephobia)، **صفر** وابستگی transitive.
- devDependency تست: `happy-dom@15.7.4` (فقط dev، وارد باندل نمی‌شود).

## جایگزین بدون‌وابستگی بررسی‌شده

- **بدون preact:** رندر دستی DOM → ناسازگار با قرارداد §6 (کامپوننت‌های Preact ui-kit) و app-shell. رد شد.
- **برای شکاف الف/ب/ج، آداپتور موقت در duel-mode پیاده شده** (طبق خط قرمز ۲ «تا تأیید با قرارداد فعلی کار کن»):
  - DNF: کانونشن `guessCount === 0` یعنی «حل نشد» (`DUEL_DNF`).
  - seed مهمان: مشتق قطعی از duelId با هش FNV-1a (`seedFromDuelId`).
  - انقضا: کلاینت `error: 'EXPIRED'` سرور را می‌فهمد + محاسبه‌ی محلی `isDuelExpired`.
  - با تأیید RFC، آداپتورها حذف و فیلدهای رسمی جایگزین می‌شوند.

## پکیج‌های متأثر

- `packages/contracts` (سه افزودنی اختیاریِ سازگار-به-عقب — مالک تغییر: AI-14 پس از تأیید)
- `packages/backend-api` (AI-09: برگرداندن seed/createdAt/expired و پذیرش won)
- `packages/duel-mode` (AI-10: حذف آداپتورها پس از تأیید)
- `package-lock.json` (AI-14: ثبت preact و happy-dom)

## مهاجرت

همه‌ی فیلدها اختیاری‌اند → هیچ کلاینت/سروری نمی‌شکند. duel-mode با feature-detection کار می‌کند: اگر `seed` در `GET /duel/:id` بود از آن استفاده می‌کند، وگرنه فالبک `seedFromDuelId`.

---
### تصمیم (توسط بررسی‌کننده تکمیل می‌شود)
