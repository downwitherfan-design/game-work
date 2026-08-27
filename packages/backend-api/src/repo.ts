/**
 * لایه‌ی دسترسی داده — همه‌ی SQL اینجاست (تست‌پذیر جدا از HTTP).
 */

import type { LeaderboardEntry } from '@dordaneh/contracts';
import type { D1Database } from './d1-types';
import { computeScore } from './util';

// ---------------------------------------------------------------------------
// ردیف‌های دیتابیس
// ---------------------------------------------------------------------------

interface ResultRow {
  anon_id: string;
  won: number;
  guess_count: number;
  duration_ms: number;
  score: number;
  name: string;
}

interface DuelResultRow {
  anon_id: string;
  name: string;
  guess_count: number;
  duration_ms: number;
}

export interface DailyStatsRow {
  puzzle_number: number;
  total_players: number;
  total_wins: number;
  avg_guess_count: number;
  avg_duration_ms: number;
}

// ---------------------------------------------------------------------------
// daily meta (checksum)
// ---------------------------------------------------------------------------

export async function getDailyChecksum(
  db: D1Database,
  puzzleNumber: number,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT checksum FROM daily_meta WHERE puzzle_number = ?')
    .bind(puzzleNumber)
    .first<{ checksum: string }>();
  return row?.checksum ?? null;
}

export async function upsertDailyChecksum(
  db: D1Database,
  puzzleNumber: number,
  checksum: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_meta (puzzle_number, checksum, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (puzzle_number) DO UPDATE SET checksum = excluded.checksum, updated_at = excluded.updated_at`,
    )
    .bind(puzzleNumber, checksum, now)
    .run();
}

// ---------------------------------------------------------------------------
// results — upsert (حداکثر ۱ نتیجه به‌ازای anonId+puzzleNumber) + درصدک
// ---------------------------------------------------------------------------

export interface SubmitResultInput {
  anonId: string;
  puzzleNumber: number;
  won: boolean;
  guessCount: number;
  durationMs: number;
  name: string;
  now: number;
}

export async function upsertResult(db: D1Database, r: SubmitResultInput): Promise<void> {
  const score = computeScore(r.won, r.guessCount, r.durationMs);
  await db
    .prepare(
      `INSERT INTO results (anon_id, puzzle_number, won, guess_count, duration_ms, score, name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (anon_id, puzzle_number) DO UPDATE SET
         won = excluded.won, guess_count = excluded.guess_count,
         duration_ms = excluded.duration_ms, score = excluded.score,
         name = excluded.name`,
    )
    .bind(r.anonId, r.puzzleNumber, r.won ? 1 : 0, r.guessCount, r.durationMs, score, r.name, r.now)
    .run();
}

/**
 * درصدک — «از X٪ بازیکن‌ها بهتر بودی»: درصد کاربرانی که بدتر عمل کردند
 * (باختند، یا با حدس بیشتر، یا با حدس مساوی و زمان بیشتر حل کردند).
 * قاب‌بندی مثبت (Tversky & Kahneman 1981). خروجی 0..100.
 */
export async function computePercentile(
  db: D1Database,
  puzzleNumber: number,
  won: boolean,
  guessCount: number,
  durationMs: number,
): Promise<number> {
  const totalRow = await db
    .prepare('SELECT COUNT(*) AS c FROM results WHERE puzzle_number = ?')
    .bind(puzzleNumber)
    .first<{ c: number }>();
  const total = totalRow?.c ?? 0;
  if (total <= 1) return 100; // اولین نفر — قاب مثبت

  if (!won) {
    // بازنده فقط از بازنده‌های کندتر بهتر است
    const worseRow = await db
      .prepare('SELECT COUNT(*) AS c FROM results WHERE puzzle_number = ? AND won = 0 AND duration_ms > ?')
      .bind(puzzleNumber, durationMs)
      .first<{ c: number }>();
    return Math.round(((worseRow?.c ?? 0) / total) * 100);
  }

  const worseRow = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM results
       WHERE puzzle_number = ?
         AND (won = 0 OR guess_count > ? OR (guess_count = ? AND duration_ms > ?))`,
    )
    .bind(puzzleNumber, guessCount, guessCount, durationMs)
    .first<{ c: number }>();
  return Math.round(((worseRow?.c ?? 0) / total) * 100);
}

// ---------------------------------------------------------------------------
// لیدربورد سراسری و حلقه
// ---------------------------------------------------------------------------

export const LEADERBOARD_LIMIT = 50;
export const CIRCLE_BOARD_LIMIT = 30; // Dunbar 1992 — گروه کوچک آشنا

export async function getGlobalLeaderboard(
  db: D1Database,
  puzzleNumber: number,
): Promise<LeaderboardEntry[]> {
  const res = await db
    .prepare(
      `SELECT name, score FROM results
       WHERE puzzle_number = ? AND won = 1
       ORDER BY score DESC, duration_ms ASC LIMIT ?`,
    )
    .bind(puzzleNumber, LEADERBOARD_LIMIT)
    .all<Pick<ResultRow, 'name' | 'score'>>();
  return res.results.map((r, i) => ({ name: r.name, score: r.score, rank: i + 1 }));
}

export async function getCircleBoard(
  db: D1Database,
  circleId: string,
  puzzleNumber: number,
): Promise<LeaderboardEntry[] | null> {
  const circle = await db
    .prepare('SELECT id FROM circles WHERE id = ?')
    .bind(circleId)
    .first<{ id: string }>();
  if (!circle) return null;

  const res = await db
    .prepare(
      `SELECT cm.name AS name, COALESCE(r.score, 0) AS score,
              COALESCE(r.duration_ms, 999999999) AS duration_ms
       FROM circle_members cm
       LEFT JOIN results r ON r.anon_id = cm.anon_id AND r.puzzle_number = ?
       WHERE cm.circle_id = ?
       ORDER BY score DESC, duration_ms ASC LIMIT ?`,
    )
    .bind(puzzleNumber, circleId, CIRCLE_BOARD_LIMIT)
    .all<{ name: string; score: number }>();
  return res.results.map((r, i) => ({ name: r.name, score: r.score, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// حلقه‌ی دوستان
// ---------------------------------------------------------------------------

export const CIRCLE_MAX_MEMBERS = 30;

export async function createCircle(
  db: D1Database,
  id: string,
  circleName: string,
  ownerAnon: string,
  ownerDisplayName: string,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare('INSERT INTO circles (id, name, owner_anon, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, circleName, ownerAnon, now),
    db
      .prepare(
        'INSERT INTO circle_members (circle_id, anon_id, name, joined_at) VALUES (?, ?, ?, ?)',
      )
      .bind(id, ownerAnon, ownerDisplayName, now),
  ]);
}

export type JoinCircleOutcome = 'joined' | 'already_member' | 'not_found' | 'full';

export async function joinCircle(
  db: D1Database,
  circleId: string,
  anonId: string,
  name: string,
  now: number,
): Promise<JoinCircleOutcome> {
  const circle = await db
    .prepare('SELECT id FROM circles WHERE id = ?')
    .bind(circleId)
    .first<{ id: string }>();
  if (!circle) return 'not_found';

  const member = await db
    .prepare('SELECT anon_id FROM circle_members WHERE circle_id = ? AND anon_id = ?')
    .bind(circleId, anonId)
    .first<{ anon_id: string }>();
  if (member) return 'already_member';

  const countRow = await db
    .prepare('SELECT COUNT(*) AS c FROM circle_members WHERE circle_id = ?')
    .bind(circleId)
    .first<{ c: number }>();
  if ((countRow?.c ?? 0) >= CIRCLE_MAX_MEMBERS) return 'full';

  await db
    .prepare('INSERT INTO circle_members (circle_id, anon_id, name, joined_at) VALUES (?, ?, ?, ?)')
    .bind(circleId, anonId, name, now)
    .run();
  return 'joined';
}

// ---------------------------------------------------------------------------
// دوئل ناهمزمان
// ---------------------------------------------------------------------------

export async function createDuel(
  db: D1Database,
  id: string,
  seed: number,
  creatorAnon: string,
  creatorName: string,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare('INSERT INTO duels (id, seed, creator_anon, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, seed, creatorAnon, now),
    // سازنده از ابتدا به‌عنوان بازیکن ثبت می‌شود (نتیجه‌اش بعداً upsert می‌شود)
    db
      .prepare(
        `INSERT INTO duel_results (duel_id, anon_id, name, guess_count, duration_ms, created_at)
         VALUES (?, ?, ?, 0, 0, ?)
         ON CONFLICT (duel_id, anon_id) DO NOTHING`,
      )
      .bind(id, creatorAnon, creatorName, now),
  ]);
}

export async function getDuel(
  db: D1Database,
  duelId: string,
): Promise<{ id: string; seed: number; creator_anon: string } | null> {
  return db
    .prepare('SELECT id, seed, creator_anon FROM duels WHERE id = ?')
    .bind(duelId)
    .first<{ id: string; seed: number; creator_anon: string }>();
}

export const DUEL_MAX_PLAYERS = 2;

export type DuelSubmitOutcome = 'ok' | 'not_found' | 'full';

export async function submitDuelResult(
  db: D1Database,
  duelId: string,
  anonId: string,
  name: string,
  guessCount: number,
  durationMs: number,
  now: number,
): Promise<DuelSubmitOutcome> {
  const duel = await getDuel(db, duelId);
  if (!duel) return 'not_found';

  const existing = await db
    .prepare('SELECT anon_id FROM duel_results WHERE duel_id = ? AND anon_id = ?')
    .bind(duelId, anonId)
    .first<{ anon_id: string }>();

  if (!existing) {
    const countRow = await db
      .prepare('SELECT COUNT(*) AS c FROM duel_results WHERE duel_id = ?')
      .bind(duelId)
      .first<{ c: number }>();
    if ((countRow?.c ?? 0) >= DUEL_MAX_PLAYERS) return 'full';
  }

  await db
    .prepare(
      `INSERT INTO duel_results (duel_id, anon_id, name, guess_count, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (duel_id, anon_id) DO UPDATE SET
         guess_count = excluded.guess_count, duration_ms = excluded.duration_ms,
         name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE duel_results.name END`,
    )
    .bind(duelId, anonId, name, guessCount, durationMs, now)
    .run();
  return 'ok';
}

/** بازیکنان دوئل — guess_count=0 یعنی هنوز بازی نکرده */
export async function getDuelPlayers(db: D1Database, duelId: string): Promise<DuelResultRow[]> {
  const res = await db
    .prepare(
      'SELECT anon_id, name, guess_count, duration_ms FROM duel_results WHERE duel_id = ? ORDER BY created_at ASC',
    )
    .bind(duelId)
    .all<DuelResultRow>();
  return res.results;
}

// ---------------------------------------------------------------------------
// snapshot آمار روزانه — به‌روزرسانی تنبل (بدون cron)
// ---------------------------------------------------------------------------

export async function refreshDailyStats(
  db: D1Database,
  puzzleNumber: number,
  now: number,
): Promise<DailyStatsRow> {
  const agg = await db
    .prepare(
      `SELECT COUNT(*) AS total_players,
              COALESCE(SUM(won), 0) AS total_wins,
              COALESCE(AVG(CASE WHEN won = 1 THEN guess_count END), 0) AS avg_guess_count,
              COALESCE(AVG(CASE WHEN won = 1 THEN duration_ms END), 0) AS avg_duration_ms
       FROM results WHERE puzzle_number = ?`,
    )
    .bind(puzzleNumber)
    .first<Omit<DailyStatsRow, 'puzzle_number'>>();

  const stats: DailyStatsRow = {
    puzzle_number: puzzleNumber,
    total_players: agg?.total_players ?? 0,
    total_wins: agg?.total_wins ?? 0,
    avg_guess_count: agg?.avg_guess_count ?? 0,
    avg_duration_ms: agg?.avg_duration_ms ?? 0,
  };

  await db
    .prepare(
      `INSERT INTO daily_stats (puzzle_number, total_players, total_wins, avg_guess_count, avg_duration_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (puzzle_number) DO UPDATE SET
         total_players = excluded.total_players, total_wins = excluded.total_wins,
         avg_guess_count = excluded.avg_guess_count, avg_duration_ms = excluded.avg_duration_ms,
         updated_at = excluded.updated_at`,
    )
    .bind(
      puzzleNumber,
      stats.total_players,
      stats.total_wins,
      stats.avg_guess_count,
      stats.avg_duration_ms,
      now,
    )
    .run();
  return stats;
}
