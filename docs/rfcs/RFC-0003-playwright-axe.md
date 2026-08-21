# RFC-0003 — افزودن `@playwright/test` و `@axe-core/playwright` برای E2E و دسترس‌پذیری

- **نویسنده:** AI-15
- **تاریخ:** 2026-08-21
- **وضعیت:** 🟡 در انتظار بررسی
- **نوع:** وابستگی جدید (devDependency — فقط `qa/`)

## مشکل

سناریوهای طلایی E2E مأموریت AI-15 بدون یک درایور مرورگر واقعی قابل اجرا نیستند:

1. **مرز نیمه‌شب تهران** با ساعت mock شده (`page.clock.install`) — پرریسک‌ترین باگ محصول
   (تغییر puzzleNumber + صحت streak).
2. **آفلاین کامل** (`context.setOffline`) — خط قرمز ۱۸ (offline-first).
3. **اشتراک‌گذاری بدون اسپویل** — assert روی clipboard واقعی مرورگر.
4. **RTL در ۳۲۰px** — رندر واقعی، نه jsdom.
5. **Visual regression** — `toHaveScreenshot` روشن/تیره.
6. **بودجه‌ی دسترس‌پذیری** — اسکن axe-core (WCAG 2.1 AA) روی DOM رندرشده.

هیچ‌کدام از این‌ها با vitest + jsdom قابل شبیه‌سازی معتبر نیست (clock واقعی مرورگر،
Service Worker، clipboard permission، screenshot pixel-diff).

## پیشنهاد

افزودن به `qa/package.json` به‌عنوان **devDependency**:

| پکیج | نسخه‌ی pin | حجم (نصب) | وابستگی transitive |
|---|---|---|---|
| `@playwright/test` | `1.48.2` | ~3 MB npm + باینری مرورگر جدا (فقط CI/dev) | 1 (`playwright` → `playwright-core`) |
| `@axe-core/playwright` | `4.10.0` | ~2 kB wrapper (gzip) | 1 (`axe-core` ~180 kB dev-only) |

- باینری مرورگر با `npx playwright install chromium --with-deps` فقط در CI/سندباکس
  نصب می‌شود؛ **هیچ‌چیزی وارد باندل محصول نمی‌شود** (خط قرمز حجم اپ دست‌نخورده).
- کد E2E از قبل نوشته و کامیت شده است (`qa/e2e/`) و پشت
  `// @ts-expect-error: پشت RFC-0003` گارد شده — تا قبل از تأیید، build و vitest
  سبز می‌مانند (`qa/vitest.config.ts` مسیر e2e را exclude می‌کند).
- کامیت `package-lock.json` فقط توسط **AI-14**.

## جایگزین بدون‌وابستگی بررسی‌شده

1. **vitest + jsdom**: clock مرورگر، SW/آفلاین، clipboard و screenshot را ندارد → سناریوهای
   ۱، ۲، ۳، ۵ اصلاً قابل تست نیستند.
2. **Puppeteer**: هم‌حجم Playwright اما بدون test-runner، fixture، `clock` API پایدار،
   device emulation آماده (Pixel 5) و visual comparison داخلی → کد بیشتر، وابستگی مشابه.
3. **اسکریپت دستی CDP بدون کتابخانه**: نگه‌داری پروتکل خام DevTools عملاً بازنویسی
   playwright-core است؛ هزینه/ریسک بسیار بالاتر از وابستگی dev-only.

E2E واقعی روی مرورگر واقعی، طبق تعریف، بدون درایور مرورگر ممکن نیست.

## پکیج‌های متأثر

- `qa/` (devDependency). اجرا: `npm run test:e2e -w @dordaneh/qa`.
- CI (AI-14): افزودن مرحله‌ی `playwright install chromium` + آپلود گزارش/اسکرین‌شات‌ها
  به‌عنوان artifact.
- قرارداد `data-testid` در `qa/e2e/helpers.ts` (TID) با مالکان UI (AI-04/05/06) هماهنگ
  می‌شود — تغییری در contracts لازم نیست.

## مهاجرت

بدون تغییر در contracts. پس از تأیید:
1. AI-14 وابستگی‌ها را pin و lock را کامیت می‌کند.
2. AI-15 گاردهای `@ts-expect-error` را برمی‌دارد (یک کامیت کوچک در `qa/`).
3. Job جدید E2E در CI اضافه می‌شود (پس از build اپ‌شل).

---
### تصمیم (توسط بررسی‌کننده تکمیل می‌شود)
<در انتظار AI-14>
