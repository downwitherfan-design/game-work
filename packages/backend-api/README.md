# @dordaneh/backend-api — بک‌اند Hono + Cloudflare Workers + D1 (مالک: AI-09)

لایه‌ی **اجتماعی** دُردانه: لیدربورد، حلقه‌ی دوستان، دوئل ناهمزمان، درصدک. اپ **آفلاین-اول** است — اگر این سرور کاملاً down باشد، بازی بی‌نقص کار می‌کند؛ کلاینت‌ها باید همه‌ی خطاهای شبکه را **silent-degrade** کنند (قرارداد §7).

- پشته: **Hono 4.6.3 + Cloudflare Workers + D1 (SQLite)** — رایگان تا مقیاس بزرگ، بدون نگهداری سرور
- قرارداد REST: `docs/02_CONTRACTS.md` §7 (**قطعی** — مسیر/شکل پاسخ تغییرناپذیر بدون RFC)
- Base URL: `https://api.<domain>/v1` — همه‌ی پاسخ‌ها `{ ok: boolean, data?, error? }`
- هویت: `anonId` = UUIDv4 محلی، بدون ثبت‌نام. **هیچ داده‌ی شخصی ذخیره نمی‌شود** (خط قرمز ۲۸).

## 🚀 اجرای لوکال (برای AI-08 / AI-10 / AI-12 و mock دقیق)

```bash
# از ریشه‌ی مونوریپو (نیاز: node ≥ 22)
npm install

cd packages/backend-api
echo 'ADMIN_TOKEN=dev-admin-token' > .dev.vars      # فقط لوکال — gitignored

# ساخت جدول‌ها در SQLite لوکال (.wrangler/ — خودکار، کامیت نمی‌شود)
npx wrangler d1 migrations apply dordaneh-production --local

# اجرای سرور روی :8787 (یا --port دلخواه)
npx wrangler dev --local --port 8787
```

تست و پوشش (۵۹ تست، پوشش ≥ ۹۹٪ خطوط):

```bash
npm test -w @dordaneh/backend-api
```

## 📡 مرجع Endpointها + نمونه‌ی curl

`B=http://localhost:8787/v1` (لوکال) — پروداکشن: `https://api.<domain>/v1`

### سلامت

```bash
curl $B/health
# {"ok":true,"data":{"status":"up"}}
```

### GET `/daily/:puzzleNumber/meta` — checksum صحت‌سنجی جواب آفلاین

```bash
curl $B/daily/812/meta
# {"ok":true,"data":{"checksum":"<64-hex>"}}      یا 404: {"ok":false,"error":"NOT_FOUND"}
```

تعریف checksum: `sha256hex('dordaneh:v1:<puzzleNumber>:<normalizeFa(answer)>')` — تابع `dailyChecksum()` از همین پکیج export می‌شود. سرور **خود جواب را ذخیره نمی‌کند**، فقط hash.

### POST `/result` — ثبت نتیجه‌ی ناشناس → درصدک

```bash
curl -X POST $B/result -H 'Content-Type: application/json' -d '{
  "anonId":"9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
  "puzzleNumber":812, "won":true, "guessCount":3, "durationMs":45000,
  "name":"سارا"
}'
# {"ok":true,"data":{"percentile":73}}   ← «از ۷۳٪ بازیکن‌ها بهتر بودی!»
```

- `name` اختیاری؛ نامعتبر/نامناسب → جایگزینی خودکار با «مسافر + عدد».
- **upsert**: حداکثر ۱ نتیجه به‌ازای هر `anonId+puzzleNumber` (ارسال دوباره، قبلی را به‌روز می‌کند).
- درصدک = درصد کاربرانی که بدتر عمل کردند (باخت، حدس بیشتر، یا حدس مساوی/زمان بیشتر) — قاب‌بندی مثبت.

### GET `/leaderboard/global/:puzzleNumber` — لیدربورد سراسری روزانه (۵۰ نفر برتر)

```bash
curl $B/leaderboard/global/812
# {"ok":true,"data":{"entries":[{"name":"رضا","score":897,"rank":1},...]}}
```

امتیاز (قطعی): برد = `max(1, 1000 − 100×(حدس−1) − min(300, ⌊زمان/10s⌋))` — باخت = ۰ (در لیدربورد نمی‌آید).

### GET `/daily/:puzzleNumber/stats` — آمار تجمیعی بی‌اسپویلر (افزوده)

```bash
curl $B/daily/812/stats
# {"ok":true,"data":{"totalPlayers":2,"totalWins":2,"winRate":1,"avgGuessCount":2.5,"avgDurationMs":37500}}
```

منبع «آمار زنده» game-board (AI-06) و تحلیل سختی کلمات (AI-02). snapshot در جدول `daily_stats` نگهداری می‌شود.

### POST `/circle` — ساخت حلقه‌ی دوستان

```bash
curl -X POST $B/circle -H 'Content-Type: application/json' -d '{
  "anonId":"<uuid4>", "name":"مینا", "circleName":"بچه‌های محل"
}'
# {"ok":true,"data":{"circleId":"89n97xezw3","inviteUrl":"https://dordaneh.app/circle/89n97xezw3"}}
```

`circleName` اختیاری (فیلد افزوده — `name` طبق قرارداد نام نمایشی سازنده است). سازنده خودکار عضو می‌شود.

### POST `/circle/:id/join` — پیوستن با لینک

```bash
curl -X POST $B/circle/89n97xezw3/join -H 'Content-Type: application/json' \
  -d '{"anonId":"<uuid4>","name":"رضا"}'
# {"ok":true,"data":{"ok":true}}
# 404 NOT_FOUND | 409 CIRCLE_FULL (سقف ۳۰ عضو — Dunbar 1992) | join تکراری idempotent است
```

### GET `/circle/:id/board/:puzzleNumber` — بورد روزانه‌ی اعضا

```bash
curl $B/circle/89n97xezw3/board/812
# {"ok":true,"data":{"entries":[{"name":"رضا","score":898,"rank":1},{"name":"مینا","score":692,"rank":2}]}}
# عضوی که امروز بازی نکرده با score=0 در انتهای فهرست می‌آید.
```

### POST `/duel` — ساخت دوئل ناهمزمان (UI مال AI-10)

```bash
curl -X POST $B/duel -H 'Content-Type: application/json' \
  -d '{"anonId":"<uuid4>","name":"آرش"}'
# {"ok":true,"data":{"duelId":"hvtje9hjrh","inviteUrl":"https://dordaneh.app/duel/hvtje9hjrh","seed":2004669552}}
```

هر دو طرف با همان `seed` معمای یکسان می‌سازند (موتور AI-01: `practice-<seed>`).

### POST `/duel/:id/result` — ثبت نتیجه‌ی هر طرف

```bash
curl -X POST $B/duel/hvtje9hjrh/result -H 'Content-Type: application/json' \
  -d '{"anonId":"<uuid4>","name":"بابک","guessCount":3,"durationMs":60000}'
# طرف اول: {"ok":true,"data":{"status":"waiting"}}
# طرف دوم: {"ok":true,"data":{"status":"finished","opponent":{"name":"آرش","guessCount":4,"durationMs":90000}}}
# نفر سوم: 409 DUEL_FULL — دوئل ناموجود: 404
# باخت در دوئل: guessCount=6 گزارش شود (به‌علاوه durationMs واقعی).
```

### GET `/duel/:id` — وضعیت دوئل

```bash
curl $B/duel/hvtje9hjrh
# {"ok":true,"data":{"status":"finished","players":[
#   {"name":"آرش","guessCount":4,"durationMs":90000},
#   {"name":"بابک","guessCount":3,"durationMs":60000}]}}
# بازیکنی که هنوز بازی نکرده فقط {"name":"..."} دارد (بدون guessCount).
```

### POST `/admin/daily-meta` — بارگذاری checksum (فقط ops، با secret)

```bash
curl -X POST $B/admin/daily-meta \
  -H 'Authorization: Bearer <ADMIN_TOKEN>' -H 'Content-Type: application/json' \
  -d '{"entries":[{"puzzleNumber":812,"checksum":"<64-hex>"}]}'
# {"ok":true,"data":{"count":1}}    — بدون توکن: 401 UNAUTHORIZED
```

## ⚠️ کدهای خطا (پایدار — به آن‌ها تکیه کنید)

| کد | HTTP | معنا |
|---|---|---|
| `BAD_REQUEST` | 400 | body/فیلد خراب |
| `INVALID_ANON_ID` | 400 | anonId غیر UUIDv4 |
| `INVALID_PUZZLE_NUMBER` | 400 | شماره‌ی معما نامعتبر |
| `IMPLAUSIBLE_RESULT` | 422 | نتیجه‌ی ناممکن (ضد تقلب) |
| `NOT_FOUND` | 404 | منبع ناموجود |
| `CIRCLE_FULL` | 409 | حلقه پر (۳۰ عضو) |
| `DUEL_FULL` | 409 | دوئل ۲ بازیکن دارد |
| `RATE_LIMITED` | 429 | عبور از حد مجاز |
| `UNAUTHORIZED` | 401 | admin بدون توکن |
| `INTERNAL` | 500 | خطای داخلی |

## 🛡️ ضد تقلب و Rate limiting

- **ممکن‌بودن نتیجه**: `1 ≤ guessCount ≤ 6`؛ برد با `durationMs < 5000` رد؛ باخت باید `guessCount = 6` باشد؛ سقف زمان ۶ ساعت؛ upsert (نه insert تکراری).
- **Rate limit** (پنجره‌ی ثابت per anonId per endpoint، روی D1): `result` ۱۰/دقیقه، `circle` ۵/ساعت، `circle/join` ۲۰/ساعت، `duel` ۲۰/ساعت، `duel/result` ۳۰/ساعت، خواندنی‌ها ۱۲۰/دقیقه.
- **نام‌ها**: نرمال‌سازی `normalizeFa` قرارداد + حذف کاراکترهای کنترلی/bidi + سقف ۲۴ نویسه + فیلتر واژه‌های نامناسب (لیست کوچک داخلی) → در صورت رد، «مسافر + عدد» قطعی از anonId.

## 🗃️ اسکیمای D1 (`migrations/0001_init.sql`)

`results` (unique: anon_id+puzzle_number) · `daily_meta` (checksum) · `circles` · `circle_members` · `duels` · `duel_results` · `rate_limits` · `daily_stats` — ایندکس‌ها روی `(puzzle_number)`، `(puzzle_number, score DESC)`، `(circle_id)`، `(duel_id)`.

## ☁️ استقرار پروداکشن

```bash
cd packages/backend-api
npx wrangler d1 create dordaneh-production        # database_id را در wrangler.toml بگذار
npx wrangler d1 migrations apply dordaneh-production --remote
npx wrangler secret put ADMIN_TOKEN               # هرگز در ریپو (خط قرمز ۱۱)
npx wrangler deploy
```

سپس route/domain `api.<domain>` را در داشبورد Cloudflare به Worker وصل کنید. `INVITE_BASE_URL` و `ALLOWED_ORIGINS` در `wrangler.toml` قابل تنظیم‌اند.

## 🧩 ساختار پکیج

```
src/worker.ts     # entry ورکر (فقط default export — الزام runtime)
src/index.ts      # API عمومی پکیج (createApp، ابزارها) برای تست/ابزار
src/app.ts        # روت‌های Hono — قرارداد §7
src/repo.ts       # همه‌ی SQL (لایه‌ی داده‌ی تست‌پذیر)
src/rate-limit.ts # پنجره‌ی ثابت روی D1
src/util.ts       # sanitize نام، ضد تقلب، امتیاز، checksum، shortId
src/d1-types.ts   # تایپ‌های ساختاری D1 (بدون وابستگی workers-types)
migrations/       # 0001_init.sql
test/             # MiniD1 (node:sqlite) + ۵۹ تست
```

## 🔗 وابستگی‌ها

- `hono@4.6.3` (dependency — ~۱۴KB gzip، صفر transitive)
- `wrangler@3.80.0` (devDependency — CLI لوکال/استقرار)
- `@dordaneh/contracts` (تایپ‌ها + `normalizeFa`)

ثبت در lock ریشه: RFC-0002 (تأیید/اعمال با AI-14).
