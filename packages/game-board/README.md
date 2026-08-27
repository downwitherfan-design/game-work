# @dordaneh/game-board

صفحه‌ی بازی، کیبورد فارسی و Game Feel — **مالک: AI-06**

## نمای کلی
- **هدف**: کامپوننت `GameScreen` — قلب تجربه‌ی بازی «دُردانه» با سه حالت `daily` / `practice` / `duel`
- **معماری**: جداسازی کامل منطق از نما — `createBoardController` (استور خالص و framework-free با scheduler تزریق‌پذیر) + لایه‌ی UI با Preact
- **قراردادها**: مصرف‌کننده‌ی بخش‌های ۱، ۴، ۵، ۹ از `docs/02_CONTRACTS.md` (EngineApi، EventBus، AudioApi، i18n)

## ویژگی‌های تکمیل‌شده
- ✅ برد ۶×۶ RTL (حرف اول = راست‌ترین خانه)، ریسپانسیو از 320px تا تبلت
- ✅ کیبورد لمسی فارسی: ۳ ردیف، ۳۳ حرف + Backspace + «ثبت»؛ حروف پرتکرار پهن‌تر (Fitts 1954)؛ `pointerdown` + هپتیک light (<100ms — Doherty)؛ رنگ کلیدها همگام با وضعیت حروف کشف‌شده
- ✅ کیبورد فیزیکی دسکتاپ: حروف فارسی مستقیم (+ نرمال‌سازی ی/ک عربی)، fallback نگاشت QWERTY→فارسی ویندوز، Enter/Backspace
- ✅ Game Feel: پاپ خانه + صدای `tap` هنگام تایپ؛ فلیپ پلکانی (~250ms) با صداهای flip/correct/present/absent همگام با لحظه‌ی نمایش رنگ؛ حدس نامعتبر → لرزش ردیف + توست «این کلمه رو نمی‌شناسم!» + هپتیک error، بدون جریمه؛ برد → موج حروف + کانفتی + `win`؛ باخت → نمایش محترمانه‌ی جواب + «فردا جبران می‌کنیم 💪»
- ✅ همه‌ی انیمیشن‌ها فقط `transform`/`opacity`؛ احترام کامل به `prefers-reduced-motion` (هم CSS هم مسیر نمایش فوری در کنترلر)
- ✅ جریان پایان: رویداد `puzzle_finished` روی EventBus + مودال نتیجه (توزیع حدس‌ها + دکمه‌ی اشتراک با `share_initiated`)
- ✅ راهنما: `getHint()` + در صورت اتمام سهمیه `reward_ad_requested {placement:'hint'}` + شنود `reward_ad_completed`
- ✅ نوار پیشرفت (goal-gradient — Hull 1932) بدون لو دادن موقعیت حروف
- ✅ آمار زنده‌ی بدون‌اسپویل بالای برد (social proof — Cialdini)؛ اگر داده نباشد پنهان
- ✅ حالت تمرکز: محو حاشیه‌ها بعد از ۳ حدس (Sweller — بار شناختی)
- ✅ حالت‌ها: daily با `getDailyPuzzle(puzzleNumberForNow())`، practice با انتخاب دشواری ۱–۵، duel فقط با seed
- ✅ بقای رفرش (offline-first): بازیابی وضعیت از `engine.getState()`

## API عمومی
```tsx
import { GameScreen, GAME_BOARD_CSS } from '@dordaneh/game-board';

// تزریق CSS (یک بار)
const style = document.createElement('style');
style.textContent = GAME_BOARD_CSS;
document.head.appendChild(style);

// رندر
<GameScreen mode="daily" />
<GameScreen mode="practice" />
<GameScreen mode="duel" duelSeed={12345} />
```

پراپ‌های اختیاری: `engine` / `audio` / `bus` (پیش‌فرض: آداپترهای real-or-mock)، `distribution` (توزیع تاریخی حدس‌ها)، `liveStat {percent, guess}`، `freeHintQuota`.

سایر صادرات: `createBoardController`، `KEYBOARD_ROWS` / `layoutLetters`، `mapKeyEvent`، `computeKeyStates`، `computeProgress`، `TIMINGS`، `prefersReducedMotion`، ماک‌ها (`createMockEngine`، `createMockAudio`، `evaluate`).

## ساختار
```
src/
├── logic/        # منطق خالص: controller، keyboard-layout، physical-keys،
│                 # key-states، progress، timings، reduced-motion
├── mocks/        # ماک‌های قراردادی EngineApi/AudioApi + آداپترهای real-or-mock
├── components/   # tile، board، keyboard، confetti، result-modal، game-screen
├── types/        # شیم موقت تایپ preact (تا تصویب RFC-0001)
├── styles.ts     # GAME_BOARD_CSS (توکن‌های --dor-* از ui-kit)
└── i18n.ts       # t/tFa/toastText — همه‌ی رشته‌ها از locales/fa.json
locales/fa.json   # کلیدهای gameBoard.*
test/             # ۷۲ تست، پوشش ۹۷٪ statements / ۸۶٪ branches
demo/             # دموی محلی vite (npm run demo -w @dordaneh/game-board)
```

## رویدادهای EventBus (قرارداد §4)
| رویداد | زمان |
|---|---|
| `puzzle_started` | شروع بازی تازه (نه پس از بازیابی وضعیت) |
| `guess_submitted` | هر حدس معتبر |
| `puzzle_finished {puzzleId, won, guessCount, durationMs}` | پایان بازی |
| `share_initiated {surface:'result'}` | دکمه‌ی اشتراک مودال |
| `reward_ad_requested {placement:'hint'}` | اتمام سهمیه‌ی راهنما |

## اجرا
```bash
npm run build -w @dordaneh/game-board   # tsc
npm test -w @dordaneh/game-board        # vitest + coverage (آستانه ۸۰٪)
npm run demo -w @dordaneh/game-board    # دموی محلی روی پورت 3000 (نیازمند preact محلی — RFC-0001)
```

## وضعیت DoD
- ✅ سه حالت GameScreen | ✅ کیبورد لمسی + فیزیکی | ✅ جریان کامل juice | ✅ رویدادهای قراردادی
- ✅ ۷۲ تست، پوشش ۹۷٪/۸۶٪ (آستانه ۸۰) | ✅ تست تعاملی 320px RTL با Playwright (تایپ، فلیپ، توست، برد، مودال، کانفتی)
- ✅ بودجه‌ی باندل: کل دموی build شده (شامل preact) **16KB gzip** — بسیار زیر سقف 150KB
- ✅ صفر فایل خارج از مالکیت (فقط `packages/game-board/` + `docs/rfcs/RFC-0001`)

## وابستگی‌ها
- workspace: `@dordaneh/contracts`، `@dordaneh/core-engine`، `@dordaneh/ui-kit`، `@dordaneh/audio-haptics`
- `preact`: در انتظار تصویب **RFC-0001** — فعلاً شیم تایپ موقت در `src/types/`؛ برای دمو با `npm install --no-save preact` نصب محلی می‌شود (lockfile دست‌نخورده)

## کارهای آینده
- پس از تصویب RFC-0001: حذف شیم تایپ و افزودن preact واقعی (توسط AI-14 به lockfile)
- جایگزینی خودکار ماک‌ها به‌محض پیاده‌سازی core-engine/ui-kit/audio-haptics (آداپترهای real-or-mock آماده‌اند)

*آخرین به‌روزرسانی: 2026-08-23 — شاخه‌ی `ai-06/game-screen`*
