# @dordaneh/core-engine

منطق خالص و قطعی بازی «دُردانه» — پیاده‌سازی کامل `EngineApi` از `docs/02_CONTRACTS.md` §۱.

**مالک: AI-01** · بدون DOM · بدون شبکه · بدون side effect · تنها منبع تصادف: seed ورودی.

## استفاده

```ts
import { createEngine } from '@dordaneh/core-engine';
import { wordDb } from '@dordaneh/word-db'; // پیاده‌سازی WordDbApi

const engine = createEngine({ wordDb }); // تزریق وابستگی (DI)

const { puzzleId, wordLength } = engine.getDailyPuzzle(812);
const result = engine.evaluateGuess(puzzleId, 'دردانه');
// → GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' }
const state = engine.getState(puzzleId); // PuzzleState (کپی دفاعی)
```

## API

| صادرات | توضیح |
|---|---|
| `createEngine({ wordDb, now? })` | کارخانه‌ی `EngineApi` — word-db از بیرون تزریق می‌شود؛ `now` فقط برای مُهر زمانی |
| `evaluateGuessAgainst(guess, solution)` | الگوریتم دو-گذری ارزیابی (تابع خالص، مستقل از موتور) |
| `isWinningEvaluation(ev)` | آیا همه‌ی جایگاه‌ها `correct` هستند؟ |
| `createInitialState / applyGuess / canAcceptGuess / markHintUsed` | ماشین حالت immutable |
| `EngineError` | خطای پروتکلی (`GAME_OVER` / `UNKNOWN_PUZZLE`) — نگاه کنید به RFC-0001 |
| `suggestNextDifficulty(history)` | پیشنهاد دشواری بعدی تمرین (۱..۵) |
| `getDifficultyProfile(d)` | نگاشت دشواری → (طول کلمه، tier فراوانی) |
| `isDordanehDay(puzzleNumber)` | آیا امروز «روز دُردانه» (جایزه‌دار) است؟ نرخ ~۱/۷، قطعی |
| `computeBestHint(state, solution)` | بهترین راهنما (اکتشافی آنتروپی) |
| `mulberry32 / hashInt / combineSeeds` | PRNG قطعی برای مصرف‌کنندگان seed-دار |

## تصمیمات الگوریتمی

### ۱) ارزیابی حدس — الگوریتم دو-گذری استاندارد Wordle

پرتکرارترین باگ کلون‌های Wordle، مدیریت غلط حروف تکراری است. راه‌حل:

1. **گذر ۱ (correct):** جایگاه‌های هم‌حرف را `correct` علامت بزن و **از شمارنده‌ی هر حرفِ جواب کم کن**.
2. **گذر ۲ (present):** برای جایگاه‌های باقیمانده، `present` فقط تا سقف باقیمانده‌ی شمارنده (چپ‌به‌راستِ ایندکس)؛ مازاد → `absent`.

نتیجه: تعداد علامت‌های غیر-absent هر حرف هرگز از تعداد وقوعش در جواب بیشتر نمی‌شود (این خاصیت به‌صورت property-test در `test/evaluate-guess.test.ts` بررسی می‌شود — ۱۷ تست اختصاصی حروف تکراری).

### ۲) ماشین حالت

`playing → won | lost` — گذارها immutable هستند. `solution` طبق قرارداد **فقط پس از پایان بازی** در state قرار می‌گیرد. حدس پس از پایان یا `puzzleId` ناشناخته → `EngineError` throw می‌شود (باگ فراخواننده، نه خطای کاربر — مستند در `docs/rfcs/RFC-0001-engine-protocol-errors.md`).

### ۳) قطعیت و آفلاین-اول (خط قرمز #18)

- `getDailyPuzzle(n)`: جواب از `wordDb.getAnswer(n, 6)` — قطعی روی هر دستگاه. `getDailyPuzzle(812)` همه‌جا همان جواب را می‌دهد.
- `getPracticePuzzle(d, seed)`: seed مؤثر = `combineSeeds(seed, d)` (درهم‌سازی صحیح ۳۲بیتی با avalanche) → یکتا و بازتولیدپذیر.
- هیچ `Math.random` یا `Date` در منطق بازی نیست؛ `now()` تزریقی فقط `startedAt/finishedAt` را مهر می‌زند.

### ۴) دشواری پویا — نظریه‌ی Flow (Csikszentmihalyi 1990؛ Chen 2007)

چالش باید هم‌گام با مهارت رشد کند تا بازیکن در «کانال Flow» بماند (نه ملال، نه اضطراب):

| دشواری | طول کلمه | freqTier | توصیف |
|:---:|:---:|:---:|---|
| ۱ | ۴ | ۱ (پرکاربرد) | گرم‌کردن |
| ۲ | ۵ | ۱ | آسان |
| ۳ | ۵ | ۲ | متوسط |
| ۴ | ۶ | ۲ | چالشی |
| ۵ | ۷ | ۳ (کم‌کاربرد) | استادانه |

الگوریتم تطبیقی `suggestNextDifficulty(history)`: **۲ برد پیاپی → +۱؛ ۲ باخت پیاپی → −۱؛** در غیر این صورت بدون تغییر (clamp به ۱..۵).

### ۵) آنبوردینگ — پیروزی ۳۰ ثانیه‌ای (Bandura 1977)

`getOnboardingPuzzle()`: معمای دست‌چین با seed ثابت `0` و دشواری `۱` (کلمه‌ی ۴ حرفیِ بسیار پرکاربرد از word-db). تجربه‌ی موفقیت زودهنگام، خودکارآمدی (self-efficacy) و بازگشت کاربر را می‌سازد.

### ۶) «روز دُردانه» — پاداش متغیر (Ferster & Skinner 1957)

`isDordanehDay(n)`: درهم‌سازی شماره‌ی معما با نمک ثابت، `hash(n) % 7 === 0` → نرخ ~۱/۷ اما **غیرقابل پیش‌بینی از دید کاربر** (برنامه‌ی تقویت نسبیِ متغیر — اثربخش‌ترین زمان‌بندی پاداش). خروجی قطعی است تا آفلاین و بین دستگاه‌ها سازگار بماند. تست‌ها نرخ (۱۰٪..۱۹٪)، ناپریودیک بودن و «حداکثر خشکسالی» را بررسی می‌کنند.

### ۷) راهنما — اکتشافی مبتنی بر آنتروپی

`getHint` جایگاهی را برمی‌گرداند که فاش‌کردنش **بیشترین کاهش فضای جواب** را دارد. چون word-db فهرست کامل واژه‌ها را صادر نمی‌کند، فضای جواب با «عدم قطعیت کاربر» مدل می‌شود:

- حرف کاملاً تازه (بدون هیچ بازخوردی) = بیشترین اطلاعات (امتیاز ۳ + بونس تازگی ۰٫۵)
- حرفی که کاربر می‌داند در کلمه هست (present) اما جایش نامعلوم = امتیاز ۲
- حرف تکراری که جایگاه دیگرش سبز شده = کمترین اطلاعات (امتیاز ۱)
- جریمه‌ی تکرار درون جواب: `−log₂(occurrences)` — معادل گسسته‌ی کاهش آنتروپی مورد انتظار با فرض توزیع یکنواخت
- تساوی → کمترین ایندکس (قطعیت کامل)

## تست

```bash
npm test -w @dordaneh/core-engine   # 113 تست + گزارش پوشش
npm run build -w @dordaneh/core-engine
```

- پوشش: **۱۰۰٪** خطوط/شاخه‌ها/توابع در همه‌ی فایل‌ها (الزام: `evaluateGuess` و ماشین حالت ۱۰۰٪، کل پکیج ≥۹۵٪ — در `vitest.config.ts` اجباری شده).
- تست‌های ویژه‌ی فارسی: «آ» (حفظ و تمایز از «ا»)، ي/ك عربی، اعراب، ZWNJ، تکرار حرف — همه از مسیر `normalizeFa` قرارداد.
- word-db هنوز آماده نیست → mock ۳۰ کلمه‌ای فقط در `test/fixtures/` (کد تولیدی فقط به اینترفیس `WordDbApi` وابسته است — DI).

## وابستگی‌ها

فقط `@dordaneh/contracts` (تایپ‌ها + `normalizeFa`). صفر وابستگی خارجی runtime.
