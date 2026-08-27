import { describe, expect, it, vi } from 'vitest';
import { createDuelApi, createMockDuelApi, resolveDuelApi } from '../src/index';

function fetchOk(json: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(json), { status: 200 })) as unknown as typeof fetch;
}

describe('createDuelApi — قرارداد §7', () => {
  it('POST /duel با body درست و پاسخ تایپ‌شده', async () => {
    const f = fetchOk({ ok: true, data: { duelId: 'd1', inviteUrl: 'https://x/d1', seed: 42 } });
    const api = createDuelApi({ baseUrl: 'https://api.example.com/v1/', fetchFn: f });
    const res = await api.createDuel('anon-1', 'مسافر ۱');
    expect(res.ok).toBe(true);
    expect(res.data?.seed).toBe(42);
    const call = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.example.com/v1/duel'); // بدون اسلش تکراری
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body as string)).toEqual({ anonId: 'anon-1', name: 'مسافر ۱' });
  });

  it('POST /duel/:id/result — مسیر encode شده', async () => {
    const f = fetchOk({ ok: true, data: { status: 'waiting' } });
    const api = createDuelApi({ baseUrl: 'https://api.example.com/v1', fetchFn: f });
    const res = await api.submitResult('d 1', 'anon-1', 3, 60_000);
    expect(res.ok).toBe(true);
    const call = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.example.com/v1/duel/d%201/result');
  });

  it('GET /duel/:id', async () => {
    const f = fetchOk({ ok: true, data: { status: 'finished', players: [] } });
    const api = createDuelApi({ baseUrl: 'https://api.example.com/v1', fetchFn: f });
    const res = await api.getDuel('d1');
    expect(res.data?.status).toBe('finished');
    const call = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[1].method).toBe('GET');
  });

  it('HTTP خطا → silent-degrade (بدون throw)', async () => {
    const f = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const api = createDuelApi({ baseUrl: 'https://api.example.com/v1', fetchFn: f });
    const res = await api.getDuel('d1');
    expect(res).toEqual({ ok: false, error: 'HTTP_500' });
  });

  it('خطای شبکه → { ok:false, error:"NETWORK" } (آفلاین-اول)', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const api = createDuelApi({ baseUrl: 'https://api.example.com/v1', fetchFn: f });
    const res = await api.createDuel('a', 'n');
    expect(res).toEqual({ ok: false, error: 'NETWORK' });
  });

  it('پاسخ بدشکل (بدون ok) → BAD_RESPONSE', async () => {
    const f = fetchOk({ hello: 'world' });
    const api = createDuelApi({ baseUrl: 'https://api.example.com/v1', fetchFn: f });
    const res = await api.getDuel('d1');
    expect(res).toEqual({ ok: false, error: 'BAD_RESPONSE' });
  });
});

describe('resolveDuelApi — سوییچ env', () => {
  it('mode=mock → کلاینت mock', async () => {
    const api = await resolveDuelApi({ mode: 'mock' });
    const res = await api.createDuel('a', 'n');
    expect(res.ok).toBe(true);
    expect(res.data?.duelId).toMatch(/^mock-duel-/);
  });
  it('mode=real بدون baseUrl → فالبک mock (fail-soft)', async () => {
    const api = await resolveDuelApi({ mode: 'real' });
    const res = await api.createDuel('a', 'n');
    expect(res.ok).toBe(true);
  });
});

describe('createMockDuelApi — جریان کامل دو بازیکن', () => {
  it('ساخت → نتیجه A → join B با نتیجه → finished با opponent', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const created = await api.createDuel('anon-A', 'آرش');
    expect(created.ok).toBe(true);
    const duelId = created.data!.duelId;
    expect(created.data!.inviteUrl).toContain(duelId);
    expect(created.data!.seed).toBeGreaterThan(0);

    const rA = await api.submitResult(duelId, 'anon-A', 4, 80_000);
    expect(rA.data).toEqual({ status: 'waiting', opponent: undefined });

    const mid = await api.getDuel(duelId);
    expect(mid.data?.status).toBe('waiting');

    const rB = await api.submitResult(duelId, 'anon-B', 3, 100_000);
    expect(rB.data?.status).toBe('finished');
    expect(rB.data?.opponent?.name).toBe('آرش');
    expect(rB.data?.opponent?.guessCount).toBe(4);

    const fin = await api.getDuel(duelId);
    expect(fin.data?.status).toBe('finished');
    expect(fin.data?.players).toHaveLength(2);
  });

  it('دوئل ناموجود → NOT_FOUND', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    expect((await api.getDuel('nope')).error).toBe('NOT_FOUND');
    expect((await api.submitResult('nope', 'a', 1, 1)).error).toBe('NOT_FOUND');
  });

  it('نفر سوم → DUEL_FULL', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const d = (await api.createDuel('A', 'a')).data!.duelId;
    await api.submitResult(d, 'A', 3, 1);
    await api.submitResult(d, 'B', 3, 1);
    expect((await api.submitResult(d, 'C', 3, 1)).error).toBe('DUEL_FULL');
  });

  it('انقضای ۷۲ ساعته → EXPIRED', async () => {
    let now = 1_000_000;
    const api = createMockDuelApi({ latencyMs: 0, now: () => now });
    const d = (await api.createDuel('A', 'a')).data!.duelId;
    now += 72 * 3600 * 1000;
    expect((await api.getDuel(d)).error).toBe('EXPIRED');
    expect((await api.submitResult(d, 'A', 3, 1)).error).toBe('EXPIRED');
  });

  it('حریف خودکار پس از n poll (برای دمو)', async () => {
    const api = createMockDuelApi({ latencyMs: 0, autoOpponentAfterPolls: 2 });
    const d = (await api.createDuel('A', 'a')).data!.duelId;
    await api.submitResult(d, 'A', 5, 1);
    expect((await api.getDuel(d)).data?.status).toBe('waiting'); // poll 1
    const second = await api.getDuel(d); // poll 2 → حریف mock تمام می‌کند
    expect(second.data?.status).toBe('finished');
    expect(second.data?.players[1]?.guessCount).toBe(4);
  });
});
