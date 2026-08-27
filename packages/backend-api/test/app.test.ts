/**
 * تست یکپارچه‌ی اپ Hono — همه‌ی endpointهای قرارداد §7 روی MiniD1 (اسکیمای واقعی).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiResponse,
  CircleCreateData,
  DailyMetaData,
  DuelCreateData,
  DuelResultData,
  DuelStateData,
  LeaderboardData,
  ResultData,
} from '@dordaneh/contracts';
import { createApp } from '../src/app';
import type { Env } from '../src/d1-types';
import { dailyChecksum } from '../src/util';
import { createTestDb, type MiniD1 } from './mini-d1';

const app = createApp();

let db: MiniD1;
let env: Env;

function anon(): string {
  return crypto.randomUUID();
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: ApiResponse<T> }> {
  const res = await app.request(
    `http://localhost/v1${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env,
  );
  return { status: res.status, json: (await res.json()) as ApiResponse<T> };
}

/** ثبت یک نتیجه‌ی معتبر */
async function postResult(
  anonId: string,
  puzzleNumber: number,
  won: boolean,
  guessCount: number,
  durationMs: number,
  name?: string,
): Promise<{ status: number; json: ApiResponse<ResultData> }> {
  return call<ResultData>('POST', '/result', {
    anonId,
    puzzleNumber,
    won,
    guessCount,
    durationMs,
    ...(name !== undefined ? { name } : {}),
  });
}

beforeEach(() => {
  db = createTestDb();
  env = {
    DB: db,
    INVITE_BASE_URL: 'https://dordaneh.app',
    ALLOWED_ORIGINS: 'https://dordaneh.app',
    ADMIN_TOKEN: 'test-admin-token',
  };
});

// ---------------------------------------------------------------------------

describe('envelope و مسیرهای عمومی', () => {
  it('GET /v1/health → { ok, data }', async () => {
    const { status, json } = await call<{ status: string }>('GET', '/health');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data?.status).toBe('up');
  });

  it('unknown route → 404 با envelope', async () => {
    const { status, json } = await call('GET', '/nope');
    expect(status).toBe(404);
    expect(json.ok).toBe(false);
    expect(json.error).toBe('NOT_FOUND');
  });

  it('CORS: localhost مجاز است', async () => {
    const res = await app.request(
      'http://localhost/v1/health',
      { headers: { Origin: 'http://localhost:5173' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('CORS: دامنه‌ی غریبه مجاز نیست', async () => {
    const res = await app.request(
      'http://localhost/v1/health',
      { headers: { Origin: 'https://evil.example' } },
      env,
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('GET /daily/:n/meta', () => {
  it('404 وقتی checksum بارگذاری نشده', async () => {
    const { status, json } = await call<DailyMetaData>('GET', '/daily/812/meta');
    expect(status).toBe(404);
    expect(json.error).toBe('NOT_FOUND');
  });

  it('بعد از بارگذاری admin، checksum برمی‌گردد', async () => {
    const cs = await dailyChecksum(812, 'دلاور');
    const up = await call('POST', '/admin/daily-meta', { entries: [{ puzzleNumber: 812, checksum: cs }] }, { Authorization: 'Bearer test-admin-token' });
    expect(up.status).toBe(200);

    const { status, json } = await call<DailyMetaData>('GET', '/daily/812/meta');
    expect(status).toBe(200);
    expect(json.data?.checksum).toBe(cs);
  });

  it('شماره‌ی نامعتبر → 400', async () => {
    const { status } = await call('GET', '/daily/abc/meta');
    expect(status).toBe(400);
    expect((await call('GET', '/daily/0/meta')).status).toBe(400);
  });

  it('admin بدون توکن → 401', async () => {
    const { status, json } = await call('POST', '/admin/daily-meta', { entries: [] });
    expect(status).toBe(401);
    expect(json.error).toBe('UNAUTHORIZED');
  });

  it('admin با entries نامعتبر → 400', async () => {
    const bad = await call(
      'POST',
      '/admin/daily-meta',
      { entries: [{ puzzleNumber: 1, checksum: 'xyz' }] },
      { Authorization: 'Bearer test-admin-token' },
    );
    expect(bad.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------

describe('POST /result', () => {
  it('ثبت برد معتبر → percentile', async () => {
    const { status, json } = await postResult(anon(), 812, true, 3, 45_000, 'سارا');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data?.percentile).toBe(100); // اولین نفر
  });

  it('درصدک: بازیکن بهتر درصدک بالاتر می‌گیرد', async () => {
    // ۴ بازیکن بدتر (حدس بیشتر یا باخت)
    await postResult(anon(), 812, true, 5, 120_000);
    await postResult(anon(), 812, true, 6, 200_000);
    await postResult(anon(), 812, false, 6, 300_000);
    await postResult(anon(), 812, true, 4, 100_000);
    // بازیکن قوی
    const { json } = await postResult(anon(), 812, true, 2, 30_000);
    expect(json.data?.percentile).toBeGreaterThanOrEqual(80);
  });

  it('upsert: نتیجه‌ی تکراری همان anonId+puzzle ردیف جدید نمی‌سازد', async () => {
    const a = anon();
    await postResult(a, 812, true, 4, 60_000);
    await postResult(a, 812, true, 3, 50_000);
    const row = await db
      .prepare('SELECT COUNT(*) AS c FROM results WHERE puzzle_number = ?')
      .bind(812)
      .first<{ c: number }>();
    expect(row?.c).toBe(1);
    const g = await db
      .prepare('SELECT guess_count FROM results WHERE anon_id = ?')
      .bind(a)
      .first<{ guess_count: number }>();
    expect(g?.guess_count).toBe(3);
  });

  it('رد نتیجه‌ی ناممکن → 422 IMPLAUSIBLE_RESULT', async () => {
    // برد زیر ۵ ثانیه
    expect((await postResult(anon(), 812, true, 1, 2_000)).status).toBe(422);
    // حدس خارج بازه
    expect((await postResult(anon(), 812, true, 7, 60_000)).status).toBe(422);
    expect((await postResult(anon(), 812, true, 0, 60_000)).status).toBe(422);
    // باخت با کمتر از ۶ حدس
    expect((await postResult(anon(), 812, false, 2, 60_000)).status).toBe(422);
  });

  it('anonId نامعتبر → 400', async () => {
    const { status, json } = await call('POST', '/result', {
      anonId: 'nope',
      puzzleNumber: 812,
      won: true,
      guessCount: 3,
      durationMs: 60_000,
    });
    expect(status).toBe(400);
    expect(json.error).toBe('INVALID_ANON_ID');
  });

  it('body خراب → 400', async () => {
    const res = await app.request(
      'http://localhost/v1/result',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' },
      env,
    );
    expect(res.status).toBe(400);
  });

  it('rate limit: بیش از حد → 429', async () => {
    const a = anon();
    let got429 = false;
    for (let i = 0; i < 15; i++) {
      const { status } = await postResult(a, 812, true, 3, 60_000);
      if (status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });

  it('نام نامناسب → جایگزینی با نام پیش‌فرض', async () => {
    const a = anon();
    await postResult(a, 812, true, 3, 60_000, 'جنده');
    const row = await db
      .prepare('SELECT name FROM results WHERE anon_id = ?')
      .bind(a)
      .first<{ name: string }>();
    expect(row?.name).toMatch(/^مسافر /);
  });
});

// ---------------------------------------------------------------------------

describe('GET /leaderboard/global/:n', () => {
  it('مرتب‌سازی بر اساس امتیاز و رتبه‌های متوالی', async () => {
    await postResult(anon(), 812, true, 5, 120_000, 'کند');
    await postResult(anon(), 812, true, 2, 30_000, 'تیز');
    await postResult(anon(), 812, true, 3, 60_000, 'میانه');
    await postResult(anon(), 812, false, 6, 60_000, 'بازنده');

    const { status, json } = await call<LeaderboardData>('GET', '/leaderboard/global/812');
    expect(status).toBe(200);
    const entries = json.data?.entries ?? [];
    // فقط برنده‌ها
    expect(entries).toHaveLength(3);
    expect(entries[0]?.name).toBe('تیز');
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(entries[0]!.score).toBeGreaterThan(entries[2]!.score);
  });

  it('معمای خالی → آرایه‌ی خالی (نه خطا)', async () => {
    const { status, json } = await call<LeaderboardData>('GET', '/leaderboard/global/9999');
    expect(status).toBe(200);
    expect(json.data?.entries).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('حلقه‌ی دوستان', () => {
  it('ساخت حلقه → circleId و inviteUrl', async () => {
    const { status, json } = await call<CircleCreateData>('POST', '/circle', {
      anonId: anon(),
      name: 'مینا',
      circleName: 'بچه‌های محل',
    });
    expect(status).toBe(200);
    expect(json.data?.circleId).toMatch(/^[a-z2-9]{10}$/);
    expect(json.data?.inviteUrl).toBe(`https://dordaneh.app/circle/${json.data?.circleId}`);
  });

  it('join و بورد حلقه — فقط اعضا، مرتب بر اساس امتیاز', async () => {
    const owner = anon();
    const friend = anon();
    const stranger = anon();

    const created = await call<CircleCreateData>('POST', '/circle', { anonId: owner, name: 'مینا' });
    const circleId = created.json.data!.circleId;

    const joined = await call('POST', `/circle/${circleId}/join`, { anonId: friend, name: 'رضا' });
    expect(joined.status).toBe(200);

    // نتایج: عضوها + یک غریبه
    await postResult(owner, 812, true, 3, 60_000, 'مینا');
    await postResult(friend, 812, true, 2, 30_000, 'رضا');
    await postResult(stranger, 812, true, 1, 10_000, 'غریبه');

    const board = await call<LeaderboardData>('GET', `/circle/${circleId}/board/812`);
    expect(board.status).toBe(200);
    const entries = board.json.data!.entries;
    expect(entries).toHaveLength(2); // غریبه نیست
    expect(entries[0]?.name).toBe('رضا');
    expect(entries[1]?.name).toBe('مینا');
  });

  it('join تکراری idempotent است', async () => {
    const owner = anon();
    const friend = anon();
    const created = await call<CircleCreateData>('POST', '/circle', { anonId: owner, name: 'الف' });
    const circleId = created.json.data!.circleId;
    expect((await call('POST', `/circle/${circleId}/join`, { anonId: friend, name: 'ب' })).status).toBe(200);
    expect((await call('POST', `/circle/${circleId}/join`, { anonId: friend, name: 'ب' })).status).toBe(200);
    const row = await db
      .prepare('SELECT COUNT(*) AS c FROM circle_members WHERE circle_id = ?')
      .bind(circleId)
      .first<{ c: number }>();
    expect(row?.c).toBe(2);
  });

  it('حلقه‌ی ناموجود → 404', async () => {
    expect((await call('POST', '/circle/zzzzzzzzzz/join', { anonId: anon(), name: 'x' })).status).toBe(404);
    expect((await call('GET', '/circle/zzzzzzzzzz/board/812')).status).toBe(404);
  });

  it('سقف ۳۰ عضو → CIRCLE_FULL', async () => {
    const owner = anon();
    const created = await call<CircleCreateData>('POST', '/circle', { anonId: owner, name: 'الف' });
    const circleId = created.json.data!.circleId;
    // ۲۹ عضو دیگر (مالک عضو ۱ است) — مستقیم در DB تا rate limit مزاحم نشود
    for (let i = 0; i < 29; i++) {
      await db
        .prepare('INSERT INTO circle_members (circle_id, anon_id, name, joined_at) VALUES (?, ?, ?, ?)')
        .bind(circleId, crypto.randomUUID(), `عضو${i}`, Date.now())
        .run();
    }
    const { status, json } = await call('POST', `/circle/${circleId}/join`, { anonId: anon(), name: 'دیرآمده' });
    expect(status).toBe(409);
    expect(json.error).toBe('CIRCLE_FULL');
  });
});

// ---------------------------------------------------------------------------

describe('دوئل ناهمزمان', () => {
  it('ساخت دوئل → duelId/inviteUrl/seed', async () => {
    const { status, json } = await call<DuelCreateData>('POST', '/duel', { anonId: anon(), name: 'آرش' });
    expect(status).toBe(200);
    expect(json.data?.duelId).toMatch(/^[a-z2-9]{10}$/);
    expect(json.data?.inviteUrl).toBe(`https://dordaneh.app/duel/${json.data?.duelId}`);
    expect(json.data?.seed).toBeGreaterThan(0);
  });

  it('جریان کامل: ساخت → نتیجه‌ی سازنده (waiting) → نتیجه‌ی حریف (finished + opponent)', async () => {
    const creator = anon();
    const rival = anon();
    const created = await call<DuelCreateData>('POST', '/duel', { anonId: creator, name: 'آرش' });
    const duelId = created.json.data!.duelId;

    // وضعیت اولیه
    const st0 = await call<DuelStateData>('GET', `/duel/${duelId}`);
    expect(st0.json.data?.status).toBe('waiting');
    expect(st0.json.data?.players).toHaveLength(1);
    expect(st0.json.data?.players[0]).toEqual({ name: 'آرش' }); // هنوز بازی نکرده

    // نتیجه‌ی سازنده
    const r1 = await call<DuelResultData>('POST', `/duel/${duelId}/result`, {
      anonId: creator,
      guessCount: 4,
      durationMs: 90_000,
    });
    expect(r1.json.data?.status).toBe('waiting');
    expect(r1.json.data?.opponent).toBeUndefined();

    // نتیجه‌ی حریف
    const r2 = await call<DuelResultData>('POST', `/duel/${duelId}/result`, {
      anonId: rival,
      name: 'بابک',
      guessCount: 3,
      durationMs: 60_000,
    });
    expect(r2.json.data?.status).toBe('finished');
    expect(r2.json.data?.opponent).toEqual({ name: 'آرش', guessCount: 4, durationMs: 90_000 });

    // وضعیت نهایی
    const st1 = await call<DuelStateData>('GET', `/duel/${duelId}`);
    expect(st1.json.data?.status).toBe('finished');
    expect(st1.json.data?.players).toHaveLength(2);
  });

  it('نفر سوم → DUEL_FULL', async () => {
    const creator = anon();
    const created = await call<DuelCreateData>('POST', '/duel', { anonId: creator, name: 'الف' });
    const duelId = created.json.data!.duelId;
    await call('POST', `/duel/${duelId}/result`, { anonId: creator, guessCount: 3, durationMs: 30_000 });
    await call('POST', `/duel/${duelId}/result`, { anonId: anon(), guessCount: 4, durationMs: 40_000 });
    const third = await call('POST', `/duel/${duelId}/result`, { anonId: anon(), guessCount: 2, durationMs: 20_000 });
    expect(third.status).toBe(409);
    expect(third.json.error).toBe('DUEL_FULL');
  });

  it('دوئل ناموجود → 404؛ نتیجه‌ی نامعتبر → 422', async () => {
    expect((await call('GET', '/duel/zzzzzzzzzz')).status).toBe(404);
    expect(
      (await call('POST', '/duel/zzzzzzzzzz/result', { anonId: anon(), guessCount: 3, durationMs: 30_000 })).status,
    ).toBe(404);

    const created = await call<DuelCreateData>('POST', '/duel', { anonId: anon(), name: 'الف' });
    const duelId = created.json.data!.duelId;
    expect(
      (await call('POST', `/duel/${duelId}/result`, { anonId: anon(), guessCount: 9, durationMs: 30_000 })).status,
    ).toBe(422);
  });
});

// ---------------------------------------------------------------------------

describe('آمار تجمیعی روزانه (snapshot)', () => {
  it('GET /daily/:n/stats آمار بی‌اسپویلر می‌دهد', async () => {
    await postResult(anon(), 812, true, 3, 60_000);
    await postResult(anon(), 812, true, 5, 90_000);
    await postResult(anon(), 812, false, 6, 120_000);

    const { status, json } = await call<{
      totalPlayers: number;
      totalWins: number;
      winRate: number;
      avgGuessCount: number;
    }>('GET', '/daily/812/stats');
    expect(status).toBe(200);
    expect(json.data?.totalPlayers).toBe(3);
    expect(json.data?.totalWins).toBe(2);
    expect(json.data?.winRate).toBeCloseTo(2 / 3);
    expect(json.data?.avgGuessCount).toBeCloseTo(4); // میانگین حدسِ برنده‌ها: (3+5)/2
  });
});
