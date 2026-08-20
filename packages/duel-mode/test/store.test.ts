import { describe, expect, it, vi } from 'vitest';
import { createEventBus, createMemoryStorage } from '@dordaneh/contracts';
import type { AppEvent, PuzzleState } from '@dordaneh/contracts';
import {
  DUEL_DNF,
  DUEL_POLL_INTERVAL_MS,
  DUEL_STORAGE_KEYS,
  createDuelStore,
  createMockDuelApi,
  seedFromDuelId,
} from '../src/index';
import type { DuelSeriesMap } from '../src/index';

function wonPuzzle(guessCount: number, durationMs: number): PuzzleState {
  return {
    puzzleId: 'duel-x',
    wordLength: 6,
    maxGuesses: 6,
    guesses: Array.from({ length: guessCount }, () => ({
      guess: 'دردانه',
      states: ['correct', 'correct', 'correct', 'correct', 'correct', 'correct'],
    })),
    status: 'won',
    hintsUsed: 0,
    startedAt: 0,
    finishedAt: durationMs,
  };
}

function makeStore(overrides: Partial<Parameters<typeof createDuelStore>[0]> = {}) {
  const api = overrides.api ?? createMockDuelApi({ latencyMs: 0 });
  const storage = overrides.storage ?? createMemoryStorage();
  const bus = overrides.bus ?? createEventBus();
  const store = createDuelStore({
    api,
    storage,
    bus,
    featureEnabled: true,
    ...overrides,
  });
  return { store, api, storage, bus };
}

describe('feature flag (پیش‌فرض خاموش تا فاز ۲)', () => {
  it('بدون فلگ → phase=disabled و هیچ تماس شبکه', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const spy = vi.spyOn(api, 'getDuel');
    const store = createDuelStore({ api, storage: createMemoryStorage() });
    await store.enter('/duel/abc');
    expect(store.getState().phase).toBe('disabled');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('جریان سازنده (A)', () => {
  it('enter /duel → landing؛ createDuel → solving با seed/inviteUrl + رویداد puzzle_started', async () => {
    const { store, bus } = makeStore();
    const events: AppEvent[] = [];
    bus.on('puzzle_started', (e) => events.push(e));

    await store.enter('/duel');
    expect(store.getState().phase).toBe('landing');

    await store.createDuel();
    const s = store.getState();
    expect(s.phase).toBe('solving');
    expect(s.duelId).toBeTruthy();
    expect(s.seed).toBeGreaterThan(0);
    expect(s.inviteUrl).toContain(s.duelId);
    expect(events[0]).toMatchObject({ type: 'puzzle_started', mode: 'duel' });
  });

  it('پس از حل: نتیجه ذخیره‌ی محلی + phase=waiting', async () => {
    const { store, storage } = makeStore();
    await store.enter('/duel');
    await store.createDuel();
    const duelId = store.getState().duelId!;

    await store.submitPuzzleResult(wonPuzzle(4, 90_000));
    const s = store.getState();
    expect(s.phase).toBe('waiting');
    expect(s.selfResult).toEqual({ guessCount: 4, durationMs: 90_000 });
    expect(storage.get(`${DUEL_STORAGE_KEYS.resultPrefix}${duelId}`)).toEqual({
      guessCount: 4,
      durationMs: 90_000,
    });
  });

  it('share_initiated با surface=duel', async () => {
    const { store, bus } = makeStore();
    const events: AppEvent[] = [];
    bus.on('share_initiated', (e) => events.push(e));
    await store.enter('/duel');
    await store.createDuel();
    store.markShareInitiated();
    expect(events[0]).toEqual({ type: 'share_initiated', surface: 'duel' });
  });
});

describe('جریان مهمان (B) — ضد اسپویل', () => {
  async function hostCreatesAndSolves() {
    const api = createMockDuelApi({ latencyMs: 0 });
    const created = await api.createDuel('anon-A', 'آرش');
    const duelId = created.data!.duelId;
    await api.submitResult(duelId, 'anon-A', 2, 30_000); // A عالی بازی کرده
    return { api, duelId };
  }

  it('B از لینک وارد می‌شود → invited؛ هیچ آماری از A در state نیست', async () => {
    const { api, duelId } = await hostCreatesAndSolves();
    const { store } = makeStore({ api });
    await store.enter(`/duel/${duelId}`);
    const s = store.getState();
    expect(s.phase).toBe('invited');
    expect(s.hostName).toBe('آرش'); // فقط نام — نه حدس، نه زمان، نه گرید
    expect(s.opponent).toBeNull(); // 🔒 ضد اسپویل
    expect(s.selfResult).toBeNull();
  });

  it('acceptInvite → solving با seed مشتق قطعی (آداپتور RFC-0002)', async () => {
    const { api, duelId } = await hostCreatesAndSolves();
    const { store } = makeStore({ api });
    await store.enter(`/duel/${duelId}`);
    store.acceptInvite();
    const s = store.getState();
    expect(s.phase).toBe('solving');
    expect(s.seed).toBe(seedFromDuelId(duelId));
  });

  it('B حل می‌کند → finished فوری + verdict درست (A با ۲ حدس برده)', async () => {
    const { api, duelId } = await hostCreatesAndSolves();
    const { store } = makeStore({ api });
    await store.enter(`/duel/${duelId}`);
    store.acceptInvite();
    await store.submitPuzzleResult(wonPuzzle(4, 50_000));
    const s = store.getState();
    expect(s.phase).toBe('finished');
    expect(s.opponent?.name).toBe('آرش');
    expect(s.verdict).toBe('loss'); // ۴ حدس در برابر ۲ حدس
  });

  it('باخت B (DNF) → verdict=loss و «سری دوئل» ثبت می‌شود', async () => {
    const { api, duelId } = await hostCreatesAndSolves();
    const storage = createMemoryStorage();
    const { store } = makeStore({ api, storage });
    await store.enter(`/duel/${duelId}`);
    store.acceptInvite();
    const lost: PuzzleState = { ...wonPuzzle(6, 200_000), status: 'lost' };
    await store.submitPuzzleResult(lost);
    expect(store.getState().verdict).toBe('loss');
    expect(store.getState().selfResult?.guessCount).toBe(DUEL_DNF);
    const series = storage.get<DuelSeriesMap>(DUEL_STORAGE_KEYS.series);
    expect(series?.['آرش']).toMatchObject({ wins: 0, losses: 1, draws: 0 });
  });
});

describe('polling ۳۰ ثانیه‌ای صفحه‌ی انتظار', () => {
  it('پس از waiting هر ۳۰s poll می‌زند و با پایان حریف finished می‌شود', async () => {
    vi.useFakeTimers();
    try {
      const api = createMockDuelApi({ latencyMs: 0, autoOpponentAfterPolls: 2 });
      const { store } = makeStore({ api });
      await store.enter('/duel');
      await store.createDuel();
      await store.submitPuzzleResult(wonPuzzle(3, 40_000));
      expect(store.getState().phase).toBe('waiting');

      await vi.advanceTimersByTimeAsync(DUEL_POLL_INTERVAL_MS); // poll 1 → هنوز waiting
      expect(store.getState().phase).toBe('waiting');

      await vi.advanceTimersByTimeAsync(DUEL_POLL_INTERVAL_MS); // poll 2 → حریف تمام کرد
      const s = store.getState();
      expect(s.phase).toBe('finished');
      expect(s.verdict).toBe('win'); // ۳ حدس در برابر ۴ حدس mock
    } finally {
      vi.useRealTimers();
    }
  });

  it('خطای گذرای شبکه در poll → در waiting می‌ماند (silent-degrade)', async () => {
    vi.useFakeTimers();
    try {
      const api = createMockDuelApi({ latencyMs: 0 });
      const flaky = { ...api, getDuel: vi.fn(async () => ({ ok: false, error: 'NETWORK' })) };
      const { store } = makeStore({ api: flaky });
      await store.enter('/duel');
      await store.createDuel();
      await store.submitPuzzleResult(wonPuzzle(3, 40_000));
      await vi.advanceTimersByTimeAsync(DUEL_POLL_INTERVAL_MS * 3);
      expect(store.getState().phase).toBe('waiting');
      expect(flaky.getDuel).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('انقضا و خطا', () => {
  it('ورود به دوئل منقضی → phase=expired', async () => {
    let now = 1_000_000;
    const api = createMockDuelApi({ latencyMs: 0, now: () => now });
    const d = (await api.createDuel('A', 'a')).data!.duelId;
    now += 73 * 3600 * 1000;
    const { store } = makeStore({ api });
    await store.enter(`/duel/${d}`);
    expect(store.getState().phase).toBe('expired');
  });

  it('ثبت نتیجه روی دوئل منقضی → expired', async () => {
    let now = 1_000_000;
    const api = createMockDuelApi({ latencyMs: 0, now: () => now });
    const { store } = makeStore({ api });
    await store.enter('/duel');
    await store.createDuel();
    now += 73 * 3600 * 1000;
    await store.submitPuzzleResult(wonPuzzle(3, 1000));
    expect(store.getState().phase).toBe('expired');
  });

  it('دوئل ناموجود → error؛ retry دوباره enter می‌کند', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const { store } = makeStore({ api });
    await store.enter('/duel/ghost');
    expect(store.getState().phase).toBe('error');
    await store.retry();
    expect(store.getState().phase).toBe('error'); // هنوز ناموجود — اما جریان retry سالم است
  });

  it('خطای شبکه در createDuel → error با کلید پیام', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const broken = { ...api, createDuel: vi.fn(async () => ({ ok: false, error: 'NETWORK' })) };
    const { store } = makeStore({ api: broken });
    await store.enter('/duel');
    await store.createDuel();
    const s = store.getState();
    expect(s.phase).toBe('error');
    expect(s.errorKey).toBe('duelMode.errorBody');
  });
});

describe('بازگشت به دوئل نیمه‌کاره (persist)', () => {
  it('نتیجه‌ی محلی ذخیره‌شده → مستقیم waiting (نه invited)', async () => {
    const api = createMockDuelApi({ latencyMs: 0 });
    const storage = createMemoryStorage();
    const s1 = createDuelStore({ api, storage, featureEnabled: true });
    await s1.enter('/duel');
    await s1.createDuel();
    const duelId = s1.getState().duelId!;
    await s1.submitPuzzleResult(wonPuzzle(4, 60_000));
    s1.dispose();

    // جلسه‌ی جدید (رفرش صفحه)
    const s2 = createDuelStore({ api, storage, featureEnabled: true });
    await s2.enter(`/duel/${duelId}`);
    expect(s2.getState().phase).toBe('waiting');
    expect(s2.getState().selfResult).toEqual({ guessCount: 4, durationMs: 60_000 });
    s2.dispose();
  });
});

describe('انتقام (rematch)', () => {
  it('دوئل جدید با state تازه ساخته می‌شود', async () => {
    const { store } = makeStore();
    await store.enter('/duel');
    await store.createDuel();
    const firstId = store.getState().duelId;
    await store.submitPuzzleResult(wonPuzzle(3, 1000));
    await store.rematch();
    const s = store.getState();
    expect(s.phase).toBe('solving');
    expect(s.duelId).not.toBe(firstId);
    expect(s.selfResult).toBeNull();
    expect(s.opponent).toBeNull();
  });
});

describe('anonId پایدار', () => {
  it('بین جلسات در storage ثابت می‌ماند', async () => {
    const storage = createMemoryStorage();
    const { store } = makeStore({ storage });
    await store.enter('/duel');
    await store.createDuel();
    const id1 = storage.get<string>(DUEL_STORAGE_KEYS.anonId);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    const { store: store2 } = makeStore({ storage });
    await store2.enter('/duel');
    await store2.createDuel();
    expect(storage.get<string>(DUEL_STORAGE_KEYS.anonId)).toBe(id1);
  });
});
