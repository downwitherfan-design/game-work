# RFC-0002 — وابستگی `hono` + `wrangler` برای `@dordaneh/backend-api`

- **نویسنده:** AI-09
- **تاریخ:** 2026-08-21
- **وضعیت:** 🟡 در انتظار بررسی
- **نوع:** وابستگی جدید

## مشکل

پیاده‌سازی قرارداد REST (`docs/02_CONTRACTS.md` §7) روی Cloudflare Workers بدون فریم‌ورک روتینگ/CORS و بدون CLI استقرار ممکن نیست. مسترپلن خودِ پکیج را «Hono+D1» تعریف کرده است (بخش ۷، ردیف AI-09).

## پیشنهاد

افزودن به `packages/backend-api/package.json` (انجام‌شده در شاخه‌ی `ai-09/backend-api`؛ ثبت در `package-lock.json` ریشه با AI-14):

| پکیج | نسخه (pin) | نوع | حجم | transitive |
|---|---|---|---|---|
| `hono` | `4.6.3` | dependency | ~۱۴KB gzip (فقط ماژول‌های import شده — tree-shakable) | **۰** |
| `wrangler` | `3.80.0` | devDependency | فقط CLI توسعه/استقرار — در باندل اپ نیست | زیاد اما فقط dev |

- **اثر روی AAB اندروید: صفر** — این پکیج سمت سرور (Cloudflare) است و در باندل کلاینت/اندروید قرار نمی‌گیرد؛ خارج از بودجه‌ی ۱۵۰KB پکیج‌های UI.
- `hono` صفر وابستگی transitive دارد (معیار deps-policy را می‌گذراند).
- `wrangler` devDependency است (آستانه‌ی سخت‌گیری کمتر طبق deps-policy) و تنها راه رسمی dev لوکال D1 و deploy است.

## جایگزین بدون‌وابستگی بررسی‌شده

- **روتینگ دستی با `fetch` handler خام:** برای ۱۰ endpoint با CORS پویا، پارس پارامترها، و envelope یکنواخت ≈ ۲۰۰+ خط کد شکننده و بدون تست‌ ecosystem؛ در برابر ~۱۴KB gzip صفر-transitive توجیه ندارد. ضمن این‌که مسترپلن صریحاً Hono را تعیین کرده است.
- **جایگزین wrangler:** وجود ندارد — CLI رسمی و تنها ابزار مهاجرت D1 لوکال (`--local`) و deploy است.

## پکیج‌های متأثر

- `packages/backend-api` (فقط همین workspace)
- `package-lock.json` ریشه (commit توسط AI-14)

## مهاجرت

هیچ — API عمومی و contracts تغییری نمی‌کند. تست‌های پکیج بدون شبکه (MiniD1 روی `node:sqlite` داخلی Node ≥ 22) اجرا می‌شوند و وابستگی تستی جدیدی لازم ندارند.

---
### تصمیم (توسط بررسی‌کننده تکمیل می‌شود)
