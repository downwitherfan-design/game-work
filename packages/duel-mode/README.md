# @dordaneh/duel-mode — دوئل ناهمزمان ۱به۱ (مالک: AI-10)

فیچر **فاز ۲** — پشت فلگ `duel` (پیش‌فرض خاموش). رقابت ناهمزمان با لینک دعوت، مناسب اینترنت ایران: بدون WebSocket، فقط polling سبک ۳۰ ثانیه‌ای.

## وضعیت

- ✅ جریان کامل دوئل: ساخت → حل A → لینک دعوت → حل B → نتیجه (با mock و با سرور واقعی — سوییچ env)
- ✅ ضد اسپویل تضمین‌شده در تست: B قبل از حل هیچ اطلاعی از عملکرد A نمی‌بیند (فقط «حریفت منتظرته!»)
- ✅ انقضای ۷۲ ساعته + همه‌ی حالت‌های خطا/شبکه (silent-degrade، آفلاین-اول)
- ✅ شکست محترمانه («چه دوئلی! 🤝 دور بعد مال توئه») + دکمه‌ی «انتقام» (SDT — Deci & Ryan 1985)
- ✅ گرید مقایسه‌ای بی‌اسپویلر قابل اشتراک (Berger 2013) + «سری دوئل» تجمعی با حریف ثابت (Eyal 2014)
- ✅ تست: ۵۸ تست، پوشش ~۹۵٪ (حد: ≥۸۰٪) — باندل کامل با preact: **~۱۰KB gzip** (حد: ≤۱۵۰KB)
- ⏳ در انتظار: سرور واقعی AI-09، مونتاژ GameScreen توسط app-shell، تأیید RFC-0002

## صادرات (قرارداد §6)

| صادرات | توضیح |
|---|---|
| `DuelScreen` | کامپوننت route «/duel/*» — همه‌ی حالت‌ها: landing / creating / invited / solving / waiting / finished / expired / error / disabled |
| `createDuelStore(deps)` | ماشین حالت framework-agnostic (تزریق api/storage/bus/flag) |
| `createDuelApi(cfg)` / `resolveDuelApi({mode})` | کلاینت REST قرارداد §7 + سوییچ `mock`/`real` با env |
| `createMockDuelApi(opts)` | mock سرور (تا آماده‌شدن AI-09) — انقضای ۷۲h، حریف خودکار برای دمو |
| `decideVerdict` / `isDuelExpired` / `buildDuelComparisonGrid` … | منطق خالص تست‌پذیر |
| `DUEL_FEATURE_FLAG = 'duel'` | نام فلگ فیچر (remote config §8) |

## سیم‌کشی در app-shell (نمونه)

```tsx
import { DuelScreen, createDuelStore, resolveDuelApi } from '@dordaneh/duel-mode';

const api = await resolveDuelApi({ mode: import.meta.env.VITE_DUEL_API === 'real' ? 'real' : 'mock',
                                   baseUrl: import.meta.env.VITE_API_BASE });
const store = createDuelStore({ api, storage, bus,
  featureEnabled: analytics.getRemoteConfig('duel', false) });

<DuelScreen store={store} t={t} path={currentPath} storage={storage}
  renderBoard={(p) => <GameScreen mode="duel" seed={p.seed} puzzleId={p.puzzleId} onFinished={p.onFinished} />} />
```

`renderBoard` اسلات است چون duel-mode طبق نمودار وابستگی حق import از game-board را ندارد — app-shell (تنها نقطه‌ی مونتاژ) آن را پر می‌کند.

## قواعد برد

«حدس کمتر، سپس زمان کمتر». حل‌نکرده (DNF) همیشه می‌بازد؛ دو DNF مساوی.

## آداپتورهای موقت (تا تأیید RFC-0002)

قرارداد §7 سه شکاف دارد (won غایب، seed مهمان، وضعیت expired). آداپتورها: کانونشن `DUEL_DNF = 0`، `seedFromDuelId` (FNV-1a)، و فهم `error:'EXPIRED'`. جزئیات: `docs/rfcs/RFC-0002-duel-contract-gaps-and-preact-dep.md`.

## توسعه

```bash
npm run build -w @dordaneh/duel-mode   # tsc strict
npm test -w @dordaneh/duel-mode        # vitest + coverage (حد ۸۰٪)
```
