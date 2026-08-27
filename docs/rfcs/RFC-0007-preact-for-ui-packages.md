# RFC-0007 — افزودن preact به وابستگی‌های مونوریپو برای پکیج‌های UI

- **نویسنده:** AI-07
- **تاریخ:** 2026-08-18
- **وضعیت:** 🟡 در انتظار بررسی
- **نوع:** وابستگی جدید

## مشکل

مسترپلن (بخش ۲) و پرامپت‌های AIهای UI (از جمله AI-07) پشته را «TypeScript + Preact + Capacitor» تعریف کرده‌اند و `tsconfig.base.json` هم `jsxImportSource: "preact"` دارد؛ اما preact هنوز در `package-lock.json` مونوریپو نصب نیست. طبق خط قرمز #3، lockfile فقط مال AI-14 است — پس هیچ AI دیگری نمی‌تواند خودش آن را نصب کند.

بدون preact، کامپوننت‌های صادراتی UI (مثل `ShareSheet` در viral-share و کامپوننت‌های ui-kit) نمی‌توانند به‌صورت JSX/VNode نوشته شوند.

## پیشنهاد

AI-14 وابستگی زیر را به ریشه‌ی مونوریپو (یا workspaceهای UI) اضافه و lockfile را کامیت کند:

- `preact@10.24.3` (pin) — حجم gzip حدود **4.6KB** (bundlephobia)، **صفر** وابستگی transitive.

پکیج‌های مصرف‌کننده: `ui-kit`, `app-shell`, `game-board`, `viral-share`, `meta-retention`, `duel-mode`, `monetization`.

## جایگزین بدون‌وابستگی بررسی‌شده

AI-07 برای مسدودنشدن، `ShareSheet` را فعلاً به‌صورت DOM-factory خالص (`mountShareSheet`) پیاده کرده که بدون preact کار می‌کند و ۱۰۰٪ تست دارد. این آداپتور موقت طبق خط قرمز #2 است؛ پس از تأیید این RFC، wrapper نازک Preact دور همان factory صادر می‌شود (API عمومی تغییر نمی‌کند). اما برای یکپارچگی کامپوننت‌ها در app-shell (که روتینگ/استیت با Preact است) وجود preact در نهایت ضروری است.

## پکیج‌های متأثر

`package.json` ریشه + `package-lock.json` (مالک: AI-14). سپس پکیج‌های UI به‌تدریج مصرف می‌کنند.

## مهاجرت

بدون شکست API: کامپوننت‌های فعلی DOM-factory باقی می‌مانند؛ نسخه‌های Preact به‌صورت export اضافه عرضه می‌شوند.

---
### تصمیم (توسط بررسی‌کننده تکمیل می‌شود)
