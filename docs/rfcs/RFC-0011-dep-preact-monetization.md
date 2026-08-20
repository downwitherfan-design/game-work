# RFC-0011 — افزودن وابستگی preact برای UI پکیج monetization

- **نویسنده:** AI-11
- **تاریخ:** 2026-08-20
- **وضعیت:** 🟡 در انتظار بررسی
- **نوع:** وابستگی جدید

## مشکل

پرامپت AI-11 وابستگی `preact` را برای `ShopScreen` و مودال رضایت مجاز اعلام کرده و
قرارداد §4 کامپوننت‌های ui-kit را «کامپوننت‌های Preact» تعریف می‌کند، اما preact هنوز
در `package-lock.json` مونوریپو نیست و طبق `docs/deps-policy.md` فقط AI-14 با RFC
تأییدشده می‌تواند آن را اضافه کند.

## پیشنهاد

- افزودن `preact@10.24.3` (pin دقیق) به `dependencies` ورک‌اسپیس‌های UI
  (دست‌کم `@dordaneh/monetization`؛ منطقاً ui-kit/game-board/app-shell هم نیاز دارند —
  پیشنهاد: یک‌بار در ریشه برای همه).
- حجم (bundlephobia): **~4.6KB minified+gzip** — بسیار زیر آستانه‌ی رد ۲۰KB.
- وابستگی transitive: **0**.
- نگهداری: پروژه‌ی فعال با release منظم.

## جایگزین بدون‌وابستگی بررسی‌شده

پیاده‌سازی شد و در حال استفاده است: `packages/monetization/src/ui/vdom.ts` —
یک hyperscript + renderer داخلی (~۷۰ خط، پوشش تست ۱۰۰٪). برای ShopScreen ایستا کافی
است، اما:
1. قرارداد §4 کامپوننت‌های مشترک ui-kit را Preact تعریف کرده — بدون preact،
   monetization نمی‌تواند از `Button/Modal/Toast` مشترک استفاده کند و UI دوگانه می‌شود.
2. state/rerender دستی است؛ با رشد فروشگاه (بسته‌های فصلی) هزینه‌ی نگهداری بالا می‌رود.

**تا تأیید این RFC، آداپتور موقت داخلی معتبر است** (خط قرمز ۲) و ShopScreen کاملاً
کار می‌کند — این RFC مسدودکننده نیست.

## پکیج‌های متأثر

- `@dordaneh/monetization` (متقاضی)
- به‌احتمال: `@dordaneh/ui-kit`، `@dordaneh/game-board`، `@dordaneh/app-shell`،
  `@dordaneh/meta-retention`، `@dordaneh/viral-share`، `@dordaneh/duel-mode`

## مهاجرت

ساختار `VNode` داخلی monetization با خروجی `h()` preact سازگار طراحی شده؛ پس از تأیید:
حذف `src/ui/vdom.ts` و سوییچ import ها به `preact` — بدون تغییر API عمومی پکیج.

---
### تصمیم (توسط بررسی‌کننده تکمیل می‌شود)
<در انتظار AI-14 / مدیر پروژه>
