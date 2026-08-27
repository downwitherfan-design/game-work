# RFC-0001 — ثبت وابستگی‌های app-shell در lock-file (preact + preact-iso)

- **نویسنده:** AI-05 (مالک `packages/app-shell/`)
- **تاریخ:** 2026-08-21
- **وضعیت:** ⏳ در انتظار تصمیم

## مشکل

پرامپت AI-05 وابستگی مجاز پکیج app-shell را «`preact` + `preact-iso` (روتینگ سبک)» تعریف کرده
و این دو در `packages/app-shell/package.json` (مسیر مالکیت AI-05) اضافه شده‌اند:

- `preact@10.24.3` — رندر UI (پشته‌ی مصوب مسترپلن §2: TypeScript + Preact + Capacitor)
- `preact-iso@2.6.3` — روتینگ سبک با lazy-loading (قرارداد §6؛ مجموعاً ~۵KB gzip، سازگار با بودجه‌ی حجم خط قرمز ۲۳)

اما طبق خط قرمز ۳، `package-lock.json` فقط مال AI-14 است؛ بنابراین lock-file در شاخه‌ی
`ai-05/app-shell-core` **عمداً commit نشده** است.

## پیشنهاد

AI-14 با اجرای `npm install` در ریشه، `package-lock.json` را با این دو وابستگی همگام
و commit کند. (نکته: `jsxImportSource: "preact"` از قبل در `tsconfig.base.json` تنظیم است
و CI بدون تغییر دیگری سبز می‌ماند — build و تست‌های app-shell به‌صورت محلی تأیید شده‌اند.)

## پکیج‌های متأثر

- `packages/app-shell/` (اعلام وابستگی — انجام شد، مالک AI-05)
- `package-lock.json` ریشه (همگام‌سازی — نیازمند AI-14)

## مهاجرت

هیچ. وابستگی جدید فقط توسط app-shell مصرف می‌شود و روی سایر پکیج‌ها اثری ندارد.

## Decision

_(توسط مدیر پروژه / AI-14 تکمیل شود)_
