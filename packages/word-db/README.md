# @dordaneh/word-db — دیتابیس کلمات فارسی (مالک: AI-02)

پیاده‌سازی قرارداد `WordDbApi` (بخش ۲ از `docs/02_CONTRACTS.md`) به‌همراه داده‌های سرپرستی‌شده‌ی واژگان فارسی معیار.

## داده‌ها (`data/`)

| فایل | تعداد | توضیح |
|---|---|---|
| `answers-6.json` | ۱۱۸۷ | جواب‌های روزانه‌ی ۶ حرفی — ترتیب آرایه = ترتیب انتشار. هفته‌ی اول تماماً tier ۱؛ الگوی سختی هفتگی `[۱,۱,۲,۱,۲,۲,۳]` (شنبه ساده → جمعه سخت)؛ بدون هم‌خانواده‌ی پشت‌سرهم |
| `answers-practice.json` | ۷۵۱۶ | واژه‌های تمرینی ۴–۷ حرفی با `freqTier` و `category` اختیاری |
| `valid-words.json` | ۳۲۴۴۷ | ابرمجموعه‌ی همه‌ی جواب‌ها — مبنای پذیرش حدس کاربر |
| `blocklist.json` | ۱۰۵ | واژه‌های ممنوعه — تقاطع صفر با بقیه‌ی فایل‌ها (تست خودکار) |
| `answers-meta.json` | — | متادیتای هر جواب (`freqTier`، `category`) |

همه‌ی داده‌ها **از قبل با `normalizeFa` نرمال شده‌اند** (ی/ک فارسی، بدون اعراب و نیم‌فاصله). «۶ حرفی» یعنی ۶ code point پس از نرمال‌سازی.

## API (`src/`)

```ts
import { wordDb } from '@dordaneh/word-db';

wordDb.getAnswer(puzzleNumber, 6);        // جواب روزانه — ایندکس = puzzleNumber % length
wordDb.getPracticeAnswer(seed, 3);        // تمرینی قطعی (mulberry32 داخلی، بدون وابستگی)
wordDb.isValidWord(normalized);           // O(1) با Set
wordDb.getWordMeta(normalized);           // { freqTier, category? } | undefined
```

- `getAnswer` برای طول‌های غیر ۶ به‌صورت قطعی از استخر تمرینی همان طول انتخاب می‌کند.
- `difficultyToTier`: سختی ۱–۲ → tier ۱، ۳–۴ → tier ۲، ۵ → tier ۳ (با clamp).
- `getPracticeAnswer` در صورت خالی‌بودن tier، زنجیره‌ی fallback دارد.

## اعتبارسنجی (`tools/validate.ts`)

`npm run validate` (بخشی از `npm test`) — ۸ گروه بررسی: یکتایی، طول، نرمال‌بودن و الفبای مجاز، تقاطع blocklist، پوشش در valid-words، حداقل‌های DoD، هم‌خانواده‌های پشت‌سرهم، کامل‌بودن متادیتا. **خروجی قرمز = کامیت ممنوع.**

## اسکریپت‌ها

```bash
npm run build -w @dordaneh/word-db      # tsc
npm test -w @dordaneh/word-db           # validate + vitest با پوشش ≥۹۰٪
npm run validate -w @dordaneh/word-db   # فقط دروازه‌ی داده
```

## منشأ داده‌ها

سرپرستی چندمرحله‌ای از منابع آزاد: فهرست بسامدی OpenSubtitles 2018 (hermitdave/FrequencyWords)، واژه‌نامه‌های آزاد فارسی؛ با حذف صرف‌های فعلی، ضمایر متصل، شکل‌های محاوره‌ای، اسامی خاص و واژه‌های حساس. پایپ‌لاین ساخت خارج از مخزن نگهداری می‌شود؛ فقط خروجی نهایی سرپرستی‌شده کامیت شده است.
