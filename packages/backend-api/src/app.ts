/**
 * @dordaneh/backend-api — اپ Hono (مالک: AI-09)
 * پیاده‌سازی دقیق قرارداد REST — docs/02_CONTRACTS.md §7 (قفل؛ تغییر فقط با RFC).
 * همه‌ی پاسخ‌ها { ok, data?, error? } — کلاینت‌ها خطای شبکه را silent-degrade می‌کنند.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  ApiResponse,
  CircleCreateData,
  CircleJoinData,
  DailyMetaData,
  DuelCreateData,
  DuelPlayer,
  DuelResultData,
  DuelStateData,
  DuelStatus,
  LeaderboardData,
  ResultData,
} from '@dordaneh/contracts';
import type { Env } from './d1-types';
import {
  computePercentile,
  createCircle,
  createDuel,
  getCircleBoard,
  getDailyChecksum,
  getDuel,
  getDuelPlayers,
  getGlobalLeaderboard,
  joinCircle,
  refreshDailyStats,
  submitDuelResult,
  upsertDailyChecksum,
  upsertResult,
} from './repo';
import { checkRateLimit } from './rate-limit';
import {
  isPlausibleResult,
  isValidAnonId,
  isValidPuzzleNumber,
  randomSeed,
  sanitizeName,
  shortId,
} from './util';

// ---------------------------------------------------------------------------
// پاسخ‌سازهای استاندارد
// ---------------------------------------------------------------------------

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}
function err(code: string): ApiResponse<never> {
  return { ok: false, error: code };
}

/** کدهای خطای معنادار (پایدار — کلاینت‌ها به آن تکیه می‌کنند) */
export const ERR = {
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_ANON_ID: 'INVALID_ANON_ID',
  INVALID_PUZZLE_NUMBER: 'INVALID_PUZZLE_NUMBER',
  IMPLAUSIBLE_RESULT: 'IMPLAUSIBLE_RESULT',
  NOT_FOUND: 'NOT_FOUND',
  CIRCLE_FULL: 'CIRCLE_FULL',
  DUEL_FULL: 'DUEL_FULL',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL: 'INTERNAL',
} as const;

// ---------------------------------------------------------------------------
// ساخت اپ — v1
// ---------------------------------------------------------------------------

export function createApp(): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>();

  // CORS — دامنه‌ی اپ (از env) + localhost برای dev
  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        if (!origin) return origin;
        if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
        if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return origin;
        if (origin === 'capacitor://localhost' || origin === 'https://localhost') return origin;
        const allowed = (c.env.ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        return allowed.includes(origin) ? origin : null;
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86_400,
    }),
  );

  const v1 = new Hono<{ Bindings: Env }>();

  // -------------------------------------------------------------------------
  // سلامت
  // -------------------------------------------------------------------------
  v1.get('/health', (c) => c.json(ok({ status: 'up' })));

  // -------------------------------------------------------------------------
  // GET /daily/:puzzleNumber/meta → { checksum }
  // -------------------------------------------------------------------------
  v1.get('/daily/:puzzleNumber/meta', async (c) => {
    const n = Number(c.req.param('puzzleNumber'));
    if (!isValidPuzzleNumber(n)) return c.json(err(ERR.INVALID_PUZZLE_NUMBER), 400);
    const checksum = await getDailyChecksum(c.env.DB, n);
    if (checksum === null) return c.json(err(ERR.NOT_FOUND), 404);
    const data: DailyMetaData = { checksum };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // POST /result → { percentile }
  // -------------------------------------------------------------------------
  v1.post('/result', async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return c.json(err(ERR.BAD_REQUEST), 400);

    const { anonId, puzzleNumber, won, guessCount, durationMs } = body;
    if (!isValidAnonId(anonId)) return c.json(err(ERR.INVALID_ANON_ID), 400);
    if (!isValidPuzzleNumber(puzzleNumber)) return c.json(err(ERR.INVALID_PUZZLE_NUMBER), 400);
    if (typeof won !== 'boolean' || typeof guessCount !== 'number' || typeof durationMs !== 'number')
      return c.json(err(ERR.BAD_REQUEST), 400);
    if (!isPlausibleResult({ won, guessCount, durationMs }))
      return c.json(err(ERR.IMPLAUSIBLE_RESULT), 422);

    if (!(await checkRateLimit(c.env.DB, anonId, 'result', Date.now())))
      return c.json(err(ERR.RATE_LIMITED), 429);

    const name = sanitizeName(body['name'], anonId);
    const now = Date.now();
    await upsertResult(c.env.DB, { anonId, puzzleNumber, won, guessCount, durationMs, name, now });
    const percentile = await computePercentile(c.env.DB, puzzleNumber, won, guessCount, durationMs);
    // snapshot تجمیعی — تنبل، در همان مسیر نوشتن
    await refreshDailyStats(c.env.DB, puzzleNumber, now);

    const data: ResultData = { percentile };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // GET /leaderboard/global/:puzzleNumber → { entries }
  // -------------------------------------------------------------------------
  v1.get('/leaderboard/global/:puzzleNumber', async (c) => {
    const n = Number(c.req.param('puzzleNumber'));
    if (!isValidPuzzleNumber(n)) return c.json(err(ERR.INVALID_PUZZLE_NUMBER), 400);
    const entries = await getGlobalLeaderboard(c.env.DB, n);
    const data: LeaderboardData = { entries };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // GET /daily/:puzzleNumber/stats → آمار تجمیعی بی‌اسپویلر (افزوده — بدون تداخل با قرارداد)
  // -------------------------------------------------------------------------
  v1.get('/daily/:puzzleNumber/stats', async (c) => {
    const n = Number(c.req.param('puzzleNumber'));
    if (!isValidPuzzleNumber(n)) return c.json(err(ERR.INVALID_PUZZLE_NUMBER), 400);
    const s = await refreshDailyStats(c.env.DB, n, Date.now());
    return c.json(
      ok({
        totalPlayers: s.total_players,
        totalWins: s.total_wins,
        winRate: s.total_players > 0 ? s.total_wins / s.total_players : 0,
        avgGuessCount: s.avg_guess_count,
        avgDurationMs: s.avg_duration_ms,
      }),
    );
  });

  // -------------------------------------------------------------------------
  // POST /circle → { circleId, inviteUrl }
  // -------------------------------------------------------------------------
  v1.post('/circle', async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return c.json(err(ERR.BAD_REQUEST), 400);
    const { anonId } = body;
    if (!isValidAnonId(anonId)) return c.json(err(ERR.INVALID_ANON_ID), 400);

    if (!(await checkRateLimit(c.env.DB, anonId, 'circle_create', Date.now())))
      return c.json(err(ERR.RATE_LIMITED), 429);

    const displayName = sanitizeName(body['name'], anonId);
    const circleName = typeof body['circleName'] === 'string'
      ? sanitizeName(body['circleName'], anonId)
      : '';
    const circleId = shortId(10);
    await createCircle(c.env.DB, circleId, circleName, anonId, displayName, Date.now());

    const data: CircleCreateData = {
      circleId,
      inviteUrl: `${c.env.INVITE_BASE_URL}/circle/${circleId}`,
    };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // POST /circle/:id/join → { ok }
  // -------------------------------------------------------------------------
  v1.post('/circle/:id/join', async (c) => {
    const circleId = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return c.json(err(ERR.BAD_REQUEST), 400);
    const { anonId } = body;
    if (!isValidAnonId(anonId)) return c.json(err(ERR.INVALID_ANON_ID), 400);

    if (!(await checkRateLimit(c.env.DB, anonId, 'circle_join', Date.now())))
      return c.json(err(ERR.RATE_LIMITED), 429);

    const name = sanitizeName(body['name'], anonId);
    const outcome = await joinCircle(c.env.DB, circleId, anonId, name, Date.now());
    if (outcome === 'not_found') return c.json(err(ERR.NOT_FOUND), 404);
    if (outcome === 'full') return c.json(err(ERR.CIRCLE_FULL), 409);

    const data: CircleJoinData = { ok: true };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // GET /circle/:id/board/:puzzleNumber → { entries }
  // -------------------------------------------------------------------------
  v1.get('/circle/:id/board/:puzzleNumber', async (c) => {
    const circleId = c.req.param('id');
    const n = Number(c.req.param('puzzleNumber'));
    if (!isValidPuzzleNumber(n)) return c.json(err(ERR.INVALID_PUZZLE_NUMBER), 400);
    const entries = await getCircleBoard(c.env.DB, circleId, n);
    if (entries === null) return c.json(err(ERR.NOT_FOUND), 404);
    const data: LeaderboardData = { entries };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // POST /duel → { duelId, inviteUrl, seed }
  // -------------------------------------------------------------------------
  v1.post('/duel', async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return c.json(err(ERR.BAD_REQUEST), 400);
    const { anonId } = body;
    if (!isValidAnonId(anonId)) return c.json(err(ERR.INVALID_ANON_ID), 400);

    if (!(await checkRateLimit(c.env.DB, anonId, 'duel_create', Date.now())))
      return c.json(err(ERR.RATE_LIMITED), 429);

    const name = sanitizeName(body['name'], anonId);
    const duelId = shortId(10);
    const seed = randomSeed();
    await createDuel(c.env.DB, duelId, seed, anonId, name, Date.now());

    const data: DuelCreateData = {
      duelId,
      inviteUrl: `${c.env.INVITE_BASE_URL}/duel/${duelId}`,
      seed,
    };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // POST /duel/:id/result → { status, opponent? }
  // -------------------------------------------------------------------------
  v1.post('/duel/:id/result', async (c) => {
    const duelId = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return c.json(err(ERR.BAD_REQUEST), 400);
    const { anonId, guessCount, durationMs } = body;
    if (!isValidAnonId(anonId)) return c.json(err(ERR.INVALID_ANON_ID), 400);
    if (typeof guessCount !== 'number' || typeof durationMs !== 'number')
      return c.json(err(ERR.BAD_REQUEST), 400);
    // در دوئل «باخت» هم با ۶ حدس گزارش می‌شود — همان قواعد ممکن‌بودن نتیجه
    if (
      !Number.isInteger(guessCount) ||
      guessCount < 1 ||
      guessCount > 6 ||
      !Number.isFinite(durationMs) ||
      durationMs < 0
    )
      return c.json(err(ERR.IMPLAUSIBLE_RESULT), 422);

    if (!(await checkRateLimit(c.env.DB, anonId, 'duel_result', Date.now())))
      return c.json(err(ERR.RATE_LIMITED), 429);

    const name = sanitizeName(body['name'], anonId);
    const outcome = await submitDuelResult(
      c.env.DB,
      duelId,
      anonId,
      name,
      guessCount,
      durationMs,
      Date.now(),
    );
    if (outcome === 'not_found') return c.json(err(ERR.NOT_FOUND), 404);
    if (outcome === 'full') return c.json(err(ERR.DUEL_FULL), 409);

    const players = await getDuelPlayers(c.env.DB, duelId);
    const played = players.filter((p) => p.guess_count > 0);
    const status: DuelStatus = played.length >= 2 ? 'finished' : 'waiting';
    const oppRow = played.find((p) => p.anon_id !== anonId);
    const opponent: DuelPlayer | undefined = oppRow
      ? { name: oppRow.name, guessCount: oppRow.guess_count, durationMs: oppRow.duration_ms }
      : undefined;

    const data: DuelResultData = opponent ? { status, opponent } : { status };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // GET /duel/:id → { status, players[] }
  // -------------------------------------------------------------------------
  v1.get('/duel/:id', async (c) => {
    const duelId = c.req.param('id');
    const duel = await getDuel(c.env.DB, duelId);
    if (!duel) return c.json(err(ERR.NOT_FOUND), 404);

    const rows = await getDuelPlayers(c.env.DB, duelId);
    const players: DuelPlayer[] = rows.map((p) =>
      p.guess_count > 0
        ? { name: p.name, guessCount: p.guess_count, durationMs: p.duration_ms }
        : { name: p.name },
    );
    const finished = rows.filter((p) => p.guess_count > 0).length >= 2;
    const data: DuelStateData = { status: finished ? 'finished' : 'waiting', players };
    return c.json(ok(data));
  });

  // -------------------------------------------------------------------------
  // POST /admin/daily-meta — بارگذاری checksum توسط ابزار ops (با ADMIN_TOKEN)
  // body: { entries: { puzzleNumber, checksum }[] }
  // -------------------------------------------------------------------------
  v1.post('/admin/daily-meta', async (c) => {
    const auth = c.req.header('Authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!c.env.ADMIN_TOKEN || token !== c.env.ADMIN_TOKEN)
      return c.json(err(ERR.UNAUTHORIZED), 401);

    const body = await c.req.json<{ entries?: unknown }>().catch(() => null);
    const entries = body?.entries;
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500)
      return c.json(err(ERR.BAD_REQUEST), 400);

    const now = Date.now();
    for (const e of entries as Array<Record<string, unknown>>) {
      const n = e['puzzleNumber'];
      const cs = e['checksum'];
      if (!isValidPuzzleNumber(n) || typeof cs !== 'string' || !/^[0-9a-f]{64}$/.test(cs))
        return c.json(err(ERR.BAD_REQUEST), 400);
      await upsertDailyChecksum(c.env.DB, n, cs, now);
    }
    return c.json(ok({ count: entries.length }));
  });

  app.route('/v1', v1);

  app.notFound((c) => c.json(err(ERR.NOT_FOUND), 404));
  app.onError((e, c) => {
    console.error('unhandled', e);
    return c.json(err(ERR.INTERNAL), 500);
  });

  return app;
}
