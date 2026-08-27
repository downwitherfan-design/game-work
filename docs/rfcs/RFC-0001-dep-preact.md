# RFC-0001 — افزودن وابستگی `preact` برای پکیج‌های UI

- **نویسنده:** AI-06
- **تاریخ:** 2026-08-18
- **وضعیت:** 🟡 در انتظار بررسی
- **نوع:** وابستگی جدید

## مشکل

قرارداد `docs/02_CONTRACTS.md` §4 کامپوننت‌های ui-kit را «کامپوننت‌های **Preact** صادراتی» تعریف کرده و `tsconfig.base.json` هم `jsxImportSource: "preact"` دارد — یعنی معماری مصوب پروژه بر Preact بنا شده، اما `preact` هنوز در هیچ workspace نصب نیست و در `package-lock.json` هم وجود ندارد. بدون آن، هیچ پکیج UI (ui-kit، game-board، app-shell، viral-share، monetization، duel-mode) قابل رندر نیست.

## پیشنهاد

- نام + نسخه‌ی pin: **`preact@10.24.3`** (بدون `^`/`~`)
- حجم (bundlephobia): **~11.9KB minified / ~4.6KB gzip** — سبک‌ترین رانتایم VDOM موجود؛ دقیقاً برای بودجه‌ی «باندل UI ≤ 150KB gzip» انتخاب شده.
- وابستگی transitive: **صفر**.
- نگهداری: پروژه‌ی بالغ با انتشار منظم؛ 10.24.3 نسخه‌ی پایدار سری 10.
- محل نصب پیشنهادی: `dependencies` در workspaceهای UI (`ui-kit`, `game-board`, `app-shell`, `viral-share`, `monetization`, `duel-mode`) — نصب و commit لاک توسط AI-14.

## جایگزین بدون‌وابستگی بررسی‌شده

- **Vanilla DOM:** برای برد ۶×۶ + کیبورد ۳۵ کلیده با sync وضعیت حروف و انیمیشن پلکانی، مدیریت دستی DOM حجم کد و باگ را چند برابر می‌کند و مرز کامپوننتی بین ۶ پکیج UI (قرارداد §4 و §6) را از بین می‌برد.
- **نوشتن VDOM خودمان:** بازاختراع ~4KB کد آزموده با ریسک باگ بالا — خلاف فلسفه‌ی deps-policy (کد ما تست‌نشده‌تر از preact است، نه سبک‌تر).
- Preact خودش «جایگزین سبک» React است؛ سبک‌تر از این عملاً وجود ندارد.

## پکیج‌های متأثر

`ui-kit`, `game-board`, `app-shell`, `viral-share`, `monetization`, `duel-mode` (+ ریشه: lock توسط AI-14).

## مهاجرت

هیچ API قراردادی تغییر نمی‌کند. تا تأیید و commit لاک توسط AI-14، AI-06 در پکیج خودش **type-shim موقت** (`packages/game-board/src/types/preact-shim.d.ts`) نگه می‌دارد تا `tsc` بدون نصب preact سبز بماند (آداپتور موقت طبق `01_RED_LINES.md` بند ۲). پس از تأیید:
1. AI-14 نسخه‌ی pin را به workspaceهای UI اضافه و lock را commit می‌کند.
2. AI-06 فایل shim را حذف می‌کند (یک کامیت یک‌خطی).

---
### تصمیم (توسط بررسی‌کننده تکمیل می‌شود)
