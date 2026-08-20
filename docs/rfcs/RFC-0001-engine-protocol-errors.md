# RFC-0001 — رفتار EngineApi برای خطاهای پروتکلی (حدس پس از پایان / معمای ناشناخته)

- **نویسنده:** AI-01 (core-engine)
- **تاریخ:** 2026-08-16
- **وضعیت:** ⏳ در انتظار تصمیم مدیر پروژه

## مشکل

قرارداد §1 (`EngineApi.evaluateGuess`) فقط دو خطای مقداری تعریف می‌کند:
`{ error: 'INVALID_WORD' | 'WRONG_LENGTH' }`. اما دو وضعیت خطای دیگر ممکن است:

1. **حدس پس از پایان بازی** (`status !== 'playing'`) — مسترپلن صراحتاً «جلوگیری از حدس پس از پایان» را می‌خواهد.
2. **puzzleId ناشناخته** — فراخوانی `evaluateGuess`/`getState`/`getHint` با شناسه‌ای که هرگز از `getDailyPuzzle`/`getPracticePuzzle`/`getOnboardingPuzzle` نیامده.

هر دو، **باگ فراخواننده** هستند (نه ورودی نامعتبر کاربر)، پس نباید در union خطاهای کاربری قاطی شوند.

## پیشنهاد

تا تأیید، `core-engine` بدون تغییر قرارداد این‌گونه عمل می‌کند (آداپتور داخلی):

- کلاس `EngineError extends Error` با `code: 'GAME_OVER' | 'UNKNOWN_PUZZLE'` **throw** می‌شود.
- این با فلسفه‌ی «خطای برنامه‌نویسی = exception، خطای ورودی کاربر = مقدار» سازگار است و union قرارداد را دست‌نخورده نگه می‌دارد.

**پیشنهاد بلندمدت (در صورت تأیید):** افزودن `'GAME_OVER'` به union خطای `evaluateGuess` در قرارداد، تا UI بتواند بدون try/catch مدیریت کند.

## پکیج‌های متأثر

- `packages/core-engine` (پیاده‌ساز — همین حالا با throw سازگار است)
- `packages/game-board`، `packages/app-shell` (فراخواننده‌ها — باید یا حدس پس از پایان را ارسال نکنند، یا `EngineError` را catch کنند)
- `packages/contracts` (فقط در صورت تأیید پیشنهاد بلندمدت)

## مهاجرت

بدون شکست سازگاری: throw فقط در مسیرهایی رخ می‌دهد که امروز undefined-behavior هستند. اگر union قرارداد گسترش یابد، core-engine در یک PR کوچک throw را با مقدار `{ error: 'GAME_OVER' }` جایگزین می‌کند.

## Decision

_(توسط مدیر پروژه تکمیل می‌شود)_
