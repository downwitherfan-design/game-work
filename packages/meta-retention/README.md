# @dordaneh/meta-retention — استریک، آمار، دستاوردها (مالک: AI-08)

سیستم متاگیم و بازگشت مهربانِ «دُردانه»: استریک با یخ (Streak Freeze)، صفحه‌ی آمار،
گنجینه (آلبوم کارت‌های فرهنگی با مرور فاصله‌دار)، ۲۰ دستاورد، «روز دُردانه»،
موزاییک هفتگی و یادآور مهربانِ opt-in.

## ویژگی‌ها و مبنای علمی

| ویژگی | سازوکار | مبنا |
|---|---|---|
| استریک + یخ | هر ۷ روز ۱ یخ (سقف ۲)؛ طلایی نامحدود؛ مصرف خودکار با پیام مهربان | زیان‌گریزی (Kahneman & Tversky 1979) + خط قرمز ۱۵ (هرگز استریک بی‌رحم) |
| گنجینه با «؟» | سیلوئت کارت‌های کشف‌نشده + شمارنده‌ی «۳۴ از ۳۰۰» | اثر زایگارنیک (1927) |
| ۳ کارت هدیه‌ی اول | پیشرفت اعطاشده در اولین بازدید | Endowed Progress (Nunes & Drèze 2006) |
| مرور فاصله‌دار | ۳ کارت قدیمی با فاصله‌های ۱/۳/۷/۱۴ روز | اثر فاصله‌گذاری (Ebbinghaus 1885؛ Cepeda 2006) |
| روز دُردانه | هشِ قطعیِ puzzleNumber (~هفتگی)، کارت legendary، اعلام فقط پس از حل | پاداش متغیر (Ferster & Skinner 1957) |
| موزاییک هفتگی | کاشی SVG ایرانی، ۷ قطعه به ازای ۷ روز استریک | شیب هدف (Kivetz 2006) |
| یادآور مهربان | opt-in بعد از ۳ روز متوالی؛ ساعت = میانه‌ی الگوی بازی؛ ≤۱/روز؛ خاموشی آسان | Trigger شخصی (Eyal 2014) |

## API عمومی

```ts
import { createMetaRetention, StatsScreen, AlbumScreen } from '@dordaneh/meta-retention';

const meta = createMetaRetention({ bus, storage, monetization, notifications });
// storage: کلیدهای رزروشده dor.streak / dor.stats / dor.album (قرارداد §5)
// گوش می‌دهد: puzzle_finished (فقط daily-<n> امروز)، card_revealed
// منتشر می‌کند: streak_changed
```

- `StatsScreen` — روت `/stats`: بازی‌ها، درصد برد، استریک فعلی/بهترین، هیستوگرام حدس با
  هایلایت امروز، تقویم ماهانه‌ی شمسی (Intl، بدون وابستگی)، گالری موزاییک، دکمه‌ی
  اشتراک استریک (`share_initiated`).
- `AlbumScreen` — روت `/album` («گنجینه»): گرید کارت‌ها، ProgressRing، مرور امروز،
  جزئیات کارت + اشتراک.
- منطق خالص هم صادر می‌شود: `recordDailyPlay`، `isDordanehDay`، `buildMonthCalendar`،
  `evaluateAchievements`، `dueReviews` و… (تست‌پذیر، بدون DOM).

## ساختار

```
src/
  streak.ts         # استریک + یخ (۱۰۰٪ پوشش شاخه‌ها، تست مرز روز)
  stats.ts          # آمار، ساعت پیشنهادی یادآور، منطق پرسیدن اجازه
  achievements.ts   # ۲۰ دستاورد با نام‌های بامزه‌ی فارسی
  album.ts          # کشف، هدیه‌ی اعطاشده، مرور فاصله‌دار [1,3,7,14]
  dordaneh-day.ts   # هش قطعی ~۱/۷
  jalali.ts         # تقویم شمسی با Intl (بدون وابستگی)
  notifications.ts  # درگاه انتزاعی + آداپتور Capacitor با تشخیص محیط (fail-soft)
  service.ts        # wiring با EventBus/Storage قراردادی
  ui/               # StatsScreen، AlbumScreen، MosaicTile، kit-adapter (موقت)
locales/fa.json     # همه‌ی متن‌ها (خط قرمز ۲۲ — بدون رشته‌ی هاردکد)
test/               # ۱۲۹ تست، پوشش ~۹۹٪ (آستانه‌ی CI: ۸۰٪)
```

## یادداشت‌های موقت

- `src/preact-shim.d.ts`: شیم فقط-تایپ تا تأیید `docs/rfcs/RFC-0008-dep-preact.md` —
  بعد از pin شدن preact در ریشه حذف می‌شود.
- `src/ui/kit-adapter.tsx`: آداپتور موقت (خط قرمز ۲) تا ui-kit (AI-04) کامپوننت‌های
  ProgressRing/Modal/Button را صادر کند؛ فقط توکن‌های `--dor-*` مصرف می‌کند.

## دستورات

```bash
npm run build -w @dordaneh/meta-retention     # tsc
npm test -w @dordaneh/meta-retention          # vitest
npm run test:coverage -w @dordaneh/meta-retention
```
