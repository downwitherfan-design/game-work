# 📜 قراردادهای فنی بین‌ماژولی پروژه‌ی دُردانه
### نسخه ۱.۰ — منبع واحد حقیقت. تغییر فقط با RFC تأییدشده.

این سند تعریف می‌کند هر پکیج **چه چیزی را export می‌کند** و **چه شکلی از داده رد و بدل می‌شود**. کد واقعی این تایپ‌ها در `packages/contracts/src/` زندگی می‌کند (مالک: مدیر پروژه؛ پیاده‌سازی اولیه: AI-14 طبق همین سند، سپس قفل).

---

## ۰) قواعد عمومی

- همه‌ی پکیج‌ها با نام `@dordaneh/<name>` منتشر می‌شوند و `main` آن‌ها `src/index.ts` است.
- همه‌ی تاریخ‌ها به‌صورت **شماره‌ی معما (puzzleNumber)** رد و بدل می‌شوند: `puzzleNumber = تعداد روزهای سپری‌شده از 2026-09-01 در منطقه‌ی زمانی Asia/Tehran` (روز اول = 1). تبدیل در `contracts` است — خودتان محاسبه نکنید.
- رویدادهای بین-ماژولی از **EventBus سبک قرارداد** عبور می‌کنند، نه import مستقیم UI از UI.

## ۱) تایپ‌های هسته (core)

```ts
// @dordaneh/contracts — src/core.ts

/** نویسه‌های مجاز فارسی پس از نرمال‌سازی */
export type PersianChar = string; // یک code point از الفبای فارسی نرمال

export type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export interface GuessEvaluation {
  guess: string;                 // نرمال‌شده
  states: LetterState[];         // هم‌طول با guess
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface PuzzleState {
  puzzleId: string;              // 'daily-812' یا 'practice-<seed>'
  solution?: string;             // فقط پس از پایان بازی پر می‌شود
  wordLength: number;            // MVP روزانه: 6
  maxGuesses: number;            // 6
  guesses: GuessEvaluation[];
  status: GameStatus;
  hintsUsed: number;
  startedAt: number; finishedAt?: number; // epoch ms
}

export interface EngineApi {
  /** معمای روزانه‌ی قطعی — آفلاین، از seed محلی */
  getDailyPuzzle(puzzleNumber: number): { puzzleId: string; wordLength: number };
  /** معمای تمرینی با دشواری پویا (1..5) */
  getPracticePuzzle(difficulty: number, seed?: number): { puzzleId: string; wordLength: number };
  evaluateGuess(puzzleId: string, guess: string): GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' };
  getState(puzzleId: string): PuzzleState;
  getHint(puzzleId: string): { letter: PersianChar; position: number } | null;
  /** پیروزی ۳۰ثانیه‌ای: معمای آسان دست‌چین آنبوردینگ */
  getOnboardingPuzzle(): { puzzleId: string; wordLength: number };
}

/** نرمال‌سازی متن فارسی — تنها پیاده‌سازی مجاز در کل پروژه */
export function normalizeFa(input: string): string;      // ي→ی، ك→ک، حذف اعراب/ZWNJ، ۀ→ه
export function toPersianDigits(n: number | string): string;
export function puzzleNumberForNow(): number;             // Asia/Tehran
```

## ۲) قرارداد دیتابیس کلمات (AI-02)

```ts
// @dordaneh/word-db
export interface WordDbApi {
  /** جوابِ معمای شماره n برای طول L — قطعی و آفلاین */
  getAnswer(puzzleNumber: number, wordLength: number): string;
  getPracticeAnswer(seed: number, difficulty: number): { word: string; wordLength: number };
  isValidWord(normalized: string): boolean;              // در واژه‌نامه‌ی معتبر هست؟
  getWordMeta(normalized: string): { freqTier: 1|2|3; category?: string } | null;
}
```
- **داده‌ها**: `data/answers-6.json` (آرایه‌ی مرتب؛ ایندکس = puzzleNumber % طول)، `data/valid-words.json`، `data/blocklist.json`.
- کیفیت: همه‌ی جواب‌ها واژه‌های شناخته‌شده‌ی فارسی معیار؛ هیچ واژه از blocklist؛ همه از قبل نرمال‌شده.

## ۳) قرارداد کارت فرهنگی (AI-03)

```ts
// @dordaneh/culture-cards
export type CardKind = 'proverb' | 'poem' | 'fact' | 'occasion';
export interface CultureCard {
  id: string;
  kind: CardKind;
  title: string;                // مثل: «ضرب‌المثل روز»
  body: string;                 // متن اصلی (شعر/مثل/دانستنی)
  explanation?: string;         // توضیح کوتاه ≤ ۲۲۰ نویسه
  source: string;               // منبع مستند — اجباری
  relatedWord?: string;         // کلمه‌ی معمای مرتبط (نرمال)
  occasionDate?: string;        // 'MM-DD' شمسی برای مناسبت‌ها
  shareCaption: string;         // متن آماده‌ی اشتراک ≤ ۱۴۰ نویسه
}
export interface CultureApi {
  getCardForPuzzle(puzzleNumber: number, solutionWord: string): CultureCard;
  getAlbum(): { total: number; cards: CultureCard[] };   // برای «گنجینه»
}
```

## ۴) قرارداد دیزاین‌سیستم (AI-04)

- **CSS Variables** (منبع رنگ/فونت/فاصله — استفاده در همه‌ی UIها اجباری):
```css
--dor-bg:#F7F3E9; --dor-correct:#4CAF7D; --dor-present:#E5A83B;
--dor-absent:#B7B0A3; --dor-accent:#1CA9A6; --dor-gold:#D4AF37;
--dor-dark-bg:#1B2430; --dor-dark-accent:#0E6E6B;
--dor-font:'Vazirmatn',sans-serif; --dor-radius:12px;
--dor-space-1:4px; --dor-space-2:8px; --dor-space-3:16px; --dor-space-4:24px;
```
- **کامپوننت‌های Preact صادراتی:** `Button, Tile, Modal, Card, Toast, Switch, TopBar, BottomNav, ProgressRing, Confetti` — همه با پراپ `variant` و پشتیبانی تم `[data-theme="dark"]`.

## ۵) قرارداد EventBus و استیت سراسری (AI-05 میزبان)

```ts
// @dordaneh/contracts — src/events.ts
export type AppEvent =
  | { type: 'puzzle_started'; puzzleId: string; mode: 'daily'|'practice'|'duel' }
  | { type: 'guess_submitted'; puzzleId: string; guessIndex: number }
  | { type: 'puzzle_finished'; puzzleId: string; won: boolean; guessCount: number; durationMs: number }
  | { type: 'card_revealed'; cardId: string }
  | { type: 'share_initiated'; surface: 'result'|'card'|'streak'|'duel' }
  | { type: 'share_completed'; surface: string }
  | { type: 'streak_changed'; value: number; frozen: boolean }
  | { type: 'reward_ad_requested'; placement: 'extra_guess'|'hint' }
  | { type: 'reward_ad_completed'; placement: string }
  | { type: 'purchase_completed'; sku: string }
  | { type: 'screen_viewed'; screen: string };

export interface EventBus {
  emit(e: AppEvent): void;
  on<T extends AppEvent['type']>(type: T, cb: (e: Extract<AppEvent, {type: T}>) => void): () => void;
}
```
- **ذخیره‌سازی:** فقط از `StorageApi` قرارداد (روی localStorage/Capacitor Preferences):
```ts
export interface StorageApi { get<T>(key: string): T | null; set<T>(key: string, v: T): void; }
// کلیدهای رزروشده: 'dor.profile', 'dor.streak', 'dor.stats', 'dor.puzzle.<id>',
// 'dor.album', 'dor.settings', 'dor.iap', 'dor.analytics.queue'
```

## ۶) قرارداد صفحه‌نمایش‌ها (AI-05 روت می‌کند، مالکان می‌سازند)

| Route | کامپوننت صادراتی | مالک |
|---|---|---|
| `/` (روزانه) | `GameScreen` از `@dordaneh/game-board` | AI-06 |
| `/practice` | `GameScreen mode="practice"` | AI-06 |
| `/stats` | `StatsScreen` از `@dordaneh/meta-retention` | AI-08 |
| `/album` | `AlbumScreen` از `@dordaneh/meta-retention` | AI-08 |
| `/duel/*` | `DuelScreen` از `@dordaneh/duel-mode` | AI-10 |
| `/shop` | `ShopScreen` از `@dordaneh/monetization` | AI-11 |
| `/settings` | داخلی app-shell | AI-05 |

## ۷) قرارداد REST بک‌اند (AI-09 سرور، دیگران کلاینت)

Base: `https://api.<domain>/v1` — همه‌ی پاسخ‌ها `{ ok: boolean, data?, error? }`

| Method | Path | Body | Data |
|---|---|---|---|
| GET | `/daily/:puzzleNumber/meta` | — | `{ checksum: string }` (صحت‌سنجی جواب آفلاین) |
| POST | `/result` | `{ anonId, puzzleNumber, won, guessCount, durationMs }` | `{ percentile: number }` |
| GET | `/leaderboard/global/:puzzleNumber` | — | `{ entries: {name,score,rank}[] }` |
| POST | `/circle` | `{ anonId, name }` | `{ circleId, inviteUrl }` |
| POST | `/circle/:id/join` | `{ anonId, name }` | `{ ok }` |
| GET | `/circle/:id/board/:puzzleNumber` | — | `{ entries }` |
| POST | `/duel` | `{ anonId, name }` | `{ duelId, inviteUrl, seed }` |
| POST | `/duel/:id/result` | `{ anonId, guessCount, durationMs }` | `{ status, opponent? }` |
| GET | `/duel/:id` | — | `{ status, players[] }` |

- هویت: `anonId` = UUIDv4 محلی. بدون ثبت‌نام. `name` اختیاری (پیش‌فرض: «مسافر + عدد»).
- کلاینت‌ها باید **همه‌ی خطاهای شبکه را silent-degrade کنند** (اپ آفلاین-اول است).

## ۸) قرارداد آنالیتیکس (AI-12)

```ts
export interface AnalyticsApi {
  track(e: AppEvent): void;                    // صف آفلاین + ارسال دسته‌ای
  getRemoteConfig<T>(key: string, fallback: T): T;
}
```
AI-12 خودش به EventBus گوش می‌دهد؛ **هیچ پکیجی مستقیماً analytics صدا نمی‌زند** (جز app-shell برای wiring).

## ۹) قرارداد صدا (AI-13)

```ts
export type SfxName = 'tap'|'flip'|'correct'|'present'|'absent'|'win'|'lose'|'streak'|'card_reveal'|'confetti';
export interface AudioApi {
  play(name: SfxName): void;
  setMusicEnabled(on: boolean): void; setSfxEnabled(on: boolean): void;
  haptic(kind: 'light'|'medium'|'success'|'error'): void;
}
```

## ۱۰) قرارداد مونتیزیشن (AI-11)

```ts
export type Sku = 'golden'|'pack_cooking'|'pack_cinema'|'pack_sport'|'pack_classic'|'theme_pack_1';
export interface MonetizationApi {
  isGolden(): boolean;
  ownsSku(sku: Sku): boolean;
  showRewardedAd(placement: 'extra_guess'|'hint'): Promise<'rewarded'|'skipped'|'unavailable'>;
  purchase(sku: Sku): Promise<'ok'|'cancelled'|'error'>;
}
```
- در وب/دِو: پیاده‌سازی mock (همیشه `rewarded`/`ok`). سوییچ واقعی/mock با env.

## ۱۱) قرارداد i18n (AI-15 ناظر)

- هر پکیج UI فایل `locales/fa.json` خودش را دارد؛ کلیدها با پیشوند پکیج: `"gameBoard.submit": "ثبت حدس"`.
- دسترسی فقط از طریق `t('gameBoard.submit')` قرارداد. زبان پیش‌فرض `fa`، ساختار آماده‌ی `en`, `ar`.

## ۱۲) قرارداد اشتراک‌گذاری (AI-07)

```ts
export interface ShareApi {
  buildResultGrid(state: PuzzleState): string;   // گرید ایموجی بی‌اسپویلر 🟩🟨⬜ + «دُردانه #۸۱۲»
  shareResult(state: PuzzleState): Promise<void>; // Web Share API → فالبک کپی
  shareCard(card: CultureCard): Promise<void>;    // رندر تصویر کارت (canvas) + share
  buildInviteLink(kind: 'circle'|'duel', id: string): string; // deep link
}
```

---

### 🔁 فرایند تغییر این سند
فایل `docs/rfcs/RFC-XXXX-<slug>.md` با بخش‌های: مشکل، پیشنهاد، پکیج‌های متأثر، مهاجرت. تا تأیید مدیر پروژه در همان فایل (بخش «Decision»)، قرارداد فعلی لازم‌الاجراست.
