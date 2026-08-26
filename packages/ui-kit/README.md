# @dordaneh/ui-kit — دیزاین‌سیستم و کامپوننت‌ها (مالک: AI-04)

دیزاین‌سیستم رسمی بازی «دُردانه». همه‌ی UIهای پروژه **باید** از توکن‌ها و کامپوننت‌های این پکیج استفاده کنند (خط قرمز ۲۵ — رنگ/فونت/فاصله‌ی هاردکد ممنوع).

## استفاده

```tsx
// ۱) استایل‌ها (یک بار در app-shell)
import '@dordaneh/ui-kit/src/tokens.css';
import '@dordaneh/ui-kit/src/ui-kit.css';

// ۲) کامپوننت‌ها
import { Button, Tile, Modal, Card, Toast, Switch, TopBar, BottomNav, ProgressRing, Confetti } from '@dordaneh/ui-kit';

<Tile letter="د" variant="correct" flipDelayMs={0} />
<Tile letter="ر" variant="present" flipDelayMs={250} /> {/* stagger 250ms */}
<Button variant="primary" breath>شروع بازی</Button>
<Card variant="legendary" title="دانستنی" body="…" source="لغت‌نامه دهخدا" />
```

## تم‌ها و حالت‌ها (روی `<html>` تنظیم شود)

| اتریبیوت | اثر |
|---|---|
| `data-theme="dark"` | تم تیره |
| `data-colorblind="true"` | حالت کوررنگی: سبز/کهربایی → آبی/نارنجی + الگوی شکل (● correct / ─ present) روی Tile |
| `prefers-reduced-motion` (سیستم) | همه‌ی انیمیشن‌ها خاموش؛ Confetti بدون ذره `onDone` را صدا می‌زند |

## کامپوننت‌های قرارداد (§4)

`Button, Tile, Modal, Card, Toast, Switch, TopBar, BottomNav, ProgressRing, Confetti` — همه با پراپ `variant`، RTL-first (CSS logical)، لمس ≥ 44×44px.

- **Tile**: stateهای قراردادی `empty/tbd/correct/present/absent` (تایپ `LetterState` از contracts)، flip سه‌بعدی با `rotateX` (فقط transform)، pop هنگام تایپ، `flipDelayMs` برای stagger.
- **Confetti**: canvas خالص بدون کتابخانه (≤ 3KB gzip)؛ رنگ‌ها را از توکن‌های تمِ جاری می‌خواند.
- **Card**: واریانت‌های `common/rare/legendary` (قاب طلایی) + بافت کاغذی SVG inline.
- **ProgressRing**: اعداد فارسی با `toPersianDigits` قرارداد.

## توکن‌ها

مقادیر بخش ۴ `docs/02_CONTRACTS.md` عیناً در `src/tokens.css` + توکن‌های معنایی مشتق (`--dor-ink`, `--dor-surface`, `--dor-touch-min`, …). فونت **Vazirmatn** به‌صورت `@font-face` محلی (subset فارسی+لاتین، ~37KB مجموع دو وزن) — بدون CDN (آفلاین-اول).

## نمایشگاه زنده (برای ۱۴ AI دیگر)

```bash
npx vite --config packages/ui-kit/demo/vite.config.ts   # از ریشه‌ی ریپو → http://localhost:3000
```

## تست و کیفیت

```bash
npm test -w @dordaneh/ui-kit    # 88 تست + پوشش (آستانه‌ی 80٪)
npm run build -w @dordaneh/ui-kit
```

- **کنتراست WCAG AA** خودکار برای همه‌ی ترکیب‌ها در ۴ حالت (روشن/تیره × استاندارد/کوررنگی).
- **بودجه‌ی حجم as code**: کد+استایل ≤ 150KB gzip، فونت‌ها ≤ 120KB، Confetti ≤ 3KB، مرز importها (فقط `preact` و `@dordaneh/contracts`) و ممنوعیت hex هاردکد در کامپوننت‌ها.

## وابستگی‌ها

فقط `preact` (~4KB) و `@dordaneh/contracts`.
