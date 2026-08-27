-- @dordaneh/backend-api — اسکیمای اولیه‌ی D1 (مالک: AI-09)
-- ⛔ هیچ داده‌ی شخصی ذخیره نمی‌شود (خط قرمز ۲۸): فقط anonId (UUID)، نام مستعار، اعداد بازی.

-- ---------------------------------------------------------------------------
-- نتیجه‌ی روزانه‌ی هر بازیکن — حداکثر ۱ ردیف به‌ازای (anon_id, puzzle_number)
-- score: امتیاز مشتق‌شده برای لیدربورد (حدس کمتر + زمان کمتر = بیشتر)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id       TEXT    NOT NULL,
  puzzle_number INTEGER NOT NULL,
  won           INTEGER NOT NULL CHECK (won IN (0, 1)),
  guess_count   INTEGER NOT NULL CHECK (guess_count BETWEEN 1 AND 6),
  duration_ms   INTEGER NOT NULL CHECK (duration_ms >= 0),
  score         INTEGER NOT NULL DEFAULT 0,
  name          TEXT    NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL,
  UNIQUE (anon_id, puzzle_number)
);
CREATE INDEX IF NOT EXISTS idx_results_puzzle ON results (puzzle_number);
CREATE INDEX IF NOT EXISTS idx_results_puzzle_score ON results (puzzle_number, score DESC);

-- ---------------------------------------------------------------------------
-- متادیتای معمای روزانه — checksum جواب برای صحت‌سنجی آفلاین کلاینت.
-- تعریف: sha256hex('dordaneh:v1:<puzzleNumber>:<normalizeFa(answer)>')
-- منبع داده: ابزار ops از word-db (AI-02) محاسبه و با POST /admin/daily-meta بارگذاری می‌کند.
-- (سرور خودِ جواب را هرگز ذخیره نمی‌کند — فقط hash.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_meta (
  puzzle_number INTEGER PRIMARY KEY,
  checksum      TEXT    NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- حلقه‌ی دوستان — گروه کوچک آشنایان (سقف اعضا در اپلیکیشن: ۳۰ نفر — Dunbar 1992)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS circles (
  id         TEXT    PRIMARY KEY,           -- شناسه‌ی کوتاه URL-safe
  name       TEXT    NOT NULL DEFAULT '',
  owner_anon TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS circle_members (
  circle_id  TEXT    NOT NULL,
  anon_id    TEXT    NOT NULL,
  name       TEXT    NOT NULL DEFAULT '',
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (circle_id, anon_id),
  FOREIGN KEY (circle_id) REFERENCES circles (id)
);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members (circle_id);

-- ---------------------------------------------------------------------------
-- دوئل ناهمزمان ۱به۱ — سازنده seed می‌گیرد؛ حریف با لینک join و نتیجه ثبت می‌کند
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duels (
  id           TEXT    PRIMARY KEY,
  seed         INTEGER NOT NULL,
  creator_anon TEXT    NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS duel_results (
  duel_id     TEXT    NOT NULL,
  anon_id     TEXT    NOT NULL,
  name        TEXT    NOT NULL DEFAULT '',
  -- 0 = هنوز بازی نکرده (placeholder سازنده)؛ 1..6 = نتیجه‌ی ثبت‌شده
  guess_count INTEGER NOT NULL CHECK (guess_count BETWEEN 0 AND 6),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (duel_id, anon_id),
  FOREIGN KEY (duel_id) REFERENCES duels (id)
);
CREATE INDEX IF NOT EXISTS idx_duel_results_duel ON duel_results (duel_id);

-- ---------------------------------------------------------------------------
-- Rate limiting سبک مبتنی بر D1 — پنجره‌ی ثابت per (anon_id, endpoint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT    PRIMARY KEY,          -- '<anonId>:<endpoint>:<windowStart>'
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- Snapshot روزانه‌ی آمار تجمیعی — منبع «آمار زنده‌ی بی‌اسپویلر» و تحلیل سختی
-- (به‌روزرسانی تنبل هنگام خواندن؛ بدون cron برای سادگی MVP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_stats (
  puzzle_number   INTEGER PRIMARY KEY,
  total_players   INTEGER NOT NULL DEFAULT 0,
  total_wins      INTEGER NOT NULL DEFAULT 0,
  avg_guess_count REAL    NOT NULL DEFAULT 0,
  avg_duration_ms REAL    NOT NULL DEFAULT 0,
  updated_at      INTEGER NOT NULL
);
