# @dordaneh/culture-cards — محتوای کارت‌های فرهنگی (مالک: AI-03)

پکیج داده و منطق «کارت فرهنگی روز» بازی دُردانه: پس از حل هر پازل، یک کارت
(ضرب‌المثل، بیت شعر، دانستنی یا مناسبت) به بازیکن هدیه می‌شود و در «گنجینه»
جمع می‌شود.

- **صفر وابستگی** — فقط `@dordaneh/contracts` + JSON + TypeScript خالص
- **قرارداد:** `CultureCard` و `CultureApi` در `docs/02_CONTRACTS.md` §3

## ساختار

```
packages/culture-cards/
├── data/cards.json      # دیتاست رسمی (۳۰۰+ کارت مستند)
├── src/index.ts         # پیاده‌سازی CultureApi + createCultureApi
├── src/jalali.ts        # تبدیل puzzleNumber → تاریخ شمسی MM-DD (بدون وابستگی)
├── src/validate.ts      # قواعد کیفیت محتوا (استفاده‌شده در CI و CLI)
├── tools/validate.ts    # CLI: npm run validate -w @dordaneh/culture-cards
└── test/                # ۴۳+ تست، پوشش ≥۹۰٪
```

## API

```ts
import { cultureApi, createCultureApi } from '@dordaneh/culture-cards';

// کارت امروز — قطعی (deterministic)، هرگز تصادفی نیست:
// ① کارتی که occasionDate آن با تاریخ شمسی امروزِ پازل یکی باشد
// ② کارتی که relatedWord آن (پس از normalizeFa) با واژه‌ی جواب یکی باشد
// ③ چرخش قطعی: pool مرتب با تناوب kind، ایندکس = puzzleNumber % n
const card = cultureApi.getCardForPuzzle(puzzleNumber, solutionWord);

// گنجینه (همه‌ی کارت‌ها برای آلبوم):
const { total, cards } = cultureApi.getAlbum();
```

## ترکیب محتوا (۳۰۰ کارت)

| kind | پیشوند id | تعداد | منبع اصلی |
|---|---|---|---|
| ضرب‌المثل `proverb` | `prv-` | ۱۲۵ (~۴۲٪) | امثال و حکم دهخدا |
| شعر `poem` | `poe-` | ۹۵ (~۳۲٪) | گنجور — فقط شاعران مالکیت‌عمومی |
| دانستنی `fact` | `fct-` | ۴۶ (~۱۵٪) | دهخدا، ایرانیکا، یونسکو، … |
| مناسبت `occasion` | `occ-` | ۳۴ (~۱۱٪) | تقویم رسمی ایران + ایرانیکا |

## راهنمای افزودن کارت جدید

1. **id:** الگوی `^(prv|poe|fct|occ)-\d{3}$` و سازگار با `kind`
   (مثلاً `poe-096` فقط برای `kind: "poem"`). شماره‌ی بعدیِ آزاد را بردارید.
2. **فیلدهای الزامی:** `id`, `kind`, `title`, `body`, `source`, `shareCaption`.
   اختیاری: `explanation`, `relatedWord`, `occasionDate`.
3. **منبع (خط قرمز):** هر کارت باید `source` مستند داشته باشد.
   - شعر: فقط شاعران مالکیت‌عمومی (حافظ، سعدی، مولوی، فردوسی، خیام، پروین، …)
     با ارجاع دقیق: `«حافظ، غزل ۷۷، گنجور»`. **شعر بدون منبع = رد.**
   - ضرب‌المثل: `امثال و حکم دهخدا` (+ جلد/مدخل در صورت امکان)
   - دانستنی: منبع معتبر قابل‌راستی‌آزمایی (دهخدا، ایرانیکا، یونسکو، موزه‌ها)
4. **محدودیت طول:** `explanation` ≤ ۲۲۰ نویسه، `shareCaption` ≤ ۱۴۰ نویسه.
5. **درست‌نویسی:** ی/ک فارسی (نه عربی ي/ك/ة)، نیم‌فاصله‌ی درست،
   بدون اعراب در `title`/`source` (در متن شعر مجاز است).
6. **relatedWord:** فقط حروف فارسی، ۲–۱۲ نویسه، نرمال‌شده (خروجی `normalizeFa`).
7. **occasionDate:** فقط برای `occasion`، قالب `MM-DD` شمسی
   (ماه ۰۱–۰۶ حداکثر روز ۳۱، ماه ۰۷–۱۲ حداکثر ۳۰) و **در کل دیتاست یکتا**.
8. **محتوای ممنوع:** سیاسی، حساسیت مذهبی، توهین‌آمیز — باید در کافه‌بازار
   قابل انتشار و خانواده‌پسند باشد.
9. **اعتبارسنجی پیش از کامیت:**

```bash
npm run validate -w @dordaneh/culture-cards   # خروجی قرمز = کامیت ممنوع
npm test -w @dordaneh/culture-cards           # ۴۳ تست + پوشش ≥۹۰٪
```

10. **کامیت:** دسته‌های ≤۵۰ کارت، پیام Conventional Commit، شاخه‌ی `ai-03/*`.

## قواعد اعتبارسنجی (خلاصه‌ی `src/validate.ts`)

- id یکتا + الگوی معتبر + سازگاری پیشوند با kind
- همه‌ی فیلدهای الزامی ناتهی و بدون فاصله‌ی سر/ته
- سقف طول explanation/shareCaption
- occasionDate فقط روی occasion، قالب و بازه‌ی شمسی معتبر
- relatedWord نرمال و فقط حروف فارسی
- حروف عربی ي/ك/ة در هیچ فیلدی مجاز نیست
- اعراب در title/source مجاز نیست
- body تکراری در یک kind مجاز نیست
- کف تعداد کارت‌ها: **۳۰۰** (`MIN_CARDS_TARGET`)

## ایده‌های آینده
- فیلد اختیاری `rarity` برای گیمیفیکیشن آلبوم — RFC ثبت شده:
  `docs/rfcs/RFC-0003-culture-card-rarity.md` (منتظر تأیید نگهبان قرارداد)
- رشد دیتاست تا ۵۰۰ کارت (هدف پرامپت)
