/**
 * تست A/B قطعی، wiring به EventBus، آداپتورها و سلامت کلمه.
 */
import { describe, expect, it, vi } from 'vitest';
import { createEventBus, createMemoryStorage, STORAGE_KEYS } from '@dordaneh/contracts';
import type { AppEvent } from '@dordaneh/contracts';
import { createAnalytics } from '../src/analytics';
import { bucketVariant, fnv1a32, uuidV4 } from '../src/hash';
import { wireAnalyticsToBus, ALL_APP_EVENT_TYPES } from '../src/wiring';
import {
  createConsoleAdapter,
  createHttpAdapter,
  createNoopAdapter,
  resolveAdapter,
} from '../src/adapters';
import {
  aggregateWordHealth,
  renderWordHealthReport,
  puzzleNumberFromId,
} from '../src/word-health';
import { EXP_SHARE_CTA, EXP_NOTIF_HOUR, resolveExperiment } from '../src/experiments';
import type { TransportAdapter, WireEvent } from '../src/types';

const mkA = (storage = createMemoryStorage(), adapter?: TransportAdapter) =>
  createAnalytics({
    storage,
    adapter: adapter ?? { name: 't', send: () => false },
    appVersion: '1',
    platform: 'test',
    locale: 'fa-IR',
    flushIntervalMs: 0,
    doc: null,
    batchSize: 1000,
  });

describe('A/B قطعی — getVariant', () => {
  it('برای یک anonId+experimentId همیشه همان variant (پایدار بین جلسات)', () => {
    const storage = createMemoryStorage();
    const a1 = mkA(storage);
    const v1 = a1.getVariant('share_cta_text_v1');
    a1.dispose();
    const a2 = mkA(storage); // جلسه‌ی جدید، همان anonId
    expect(a2.getVariant('share_cta_text_v1')).toBe(v1);
    a2.dispose();
  });

  it('توزیع ~۵۰/۵۰ روی جمعیت anonId ها', () => {
    let countA = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      if (bucketVariant(uuidV4(), 'exp_x') === 'A') countA++;
    }
    expect(countA / n).toBeGreaterThan(0.45);
    expect(countA / n).toBeLessThan(0.55);
  });

  it('آزمایش‌های متفاوت بکت مستقل دارند و fnv1a32 قطعی است', () => {
    expect(fnv1a32('abc')).toBe(fnv1a32('abc'));
    expect(fnv1a32('abc')).not.toBe(fnv1a32('abd'));
    // حداقل برای یک شناسه، بکت دو آزمایش متفاوت باشد (استقلال)
    let differs = false;
    for (let i = 0; i < 50 && !differs; i++) {
      const id = `anon-${i}`;
      differs = bucketVariant(id, 'exp1') !== bucketVariant(id, 'exp2');
    }
    expect(differs).toBe(true);
  });

  it('exposure یک‌بار در جلسه با قالب سیمی ژنریک experiment_exposed صف می‌شود (تا تأیید RFC-0012)', () => {
    const storage = createMemoryStorage();
    const a = mkA(storage);
    a.getVariant('notif_default_hour_v1');
    a.getVariant('notif_default_hour_v1'); // تکراری — exposure جدید نمی‌سازد
    const q = storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)!;
    const exposures = q.filter((r) => r.event === 'experiment_exposed');
    expect(exposures).toHaveLength(1);
    expect(exposures[0]!.payload['experimentId']).toBe('notif_default_hour_v1');
    expect(['A', 'B']).toContain(exposures[0]!.payload['variant']);
    a.dispose();
  });

  it('resolveExperiment مقدار variant را می‌دهد (آزمایش‌های روز اول)', () => {
    const a = mkA();
    const cta = resolveExperiment(a, EXP_SHARE_CTA);
    expect([EXP_SHARE_CTA.variants.A, EXP_SHARE_CTA.variants.B]).toContain(cta);
    const hour = resolveExperiment(a, EXP_NOTIF_HOUR);
    expect([9, 19]).toContain(hour);
    a.dispose();
  });
});

describe('wiring به EventBus (قرارداد §8)', () => {
  it('همه‌ی انواع AppEvent از bus به track می‌رسند و unsubscribe کار می‌کند', () => {
    const bus = createEventBus();
    const storage = createMemoryStorage();
    const a = mkA(storage);
    const unwire = wireAnalyticsToBus(bus, a);

    const samples: AppEvent[] = [
      { type: 'puzzle_started', puzzleId: 'daily-1', mode: 'daily' },
      { type: 'guess_submitted', puzzleId: 'daily-1', guessIndex: 1 },
      { type: 'puzzle_finished', puzzleId: 'daily-1', won: false, guessCount: 6, durationMs: 90_000 },
      { type: 'card_revealed', cardId: 'c9' },
      { type: 'share_initiated', surface: 'card' },
      { type: 'share_completed', surface: 'card' },
      { type: 'streak_changed', value: 3, frozen: true },
      { type: 'reward_ad_requested', placement: 'extra_guess' },
      { type: 'reward_ad_completed', placement: 'extra_guess' },
      { type: 'purchase_completed', sku: 'theme_pack_1' },
      { type: 'screen_viewed', screen: 'album' },
    ];
    expect(samples.map((s) => s.type).sort()).toEqual([...ALL_APP_EVENT_TYPES].sort());
    for (const s of samples) bus.emit(s);

    const q = storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)!;
    expect(q.map((r) => r.event).sort()).toEqual(samples.map((s) => s.type).sort());

    unwire();
    bus.emit({ type: 'screen_viewed', screen: 'x' });
    expect(storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)!).toHaveLength(samples.length);
    a.dispose();
  });
});

describe('آداپتورها', () => {
  const batch: WireEvent[] = [
    {
      event: 'screen_viewed',
      payload: { screen: 'home' },
      meta: {
        anonId: 'a',
        sessionId: 's',
        appVersion: '1',
        platform: 't',
        locale: 'fa',
        installWeek: '2026-W36',
        seq: 1,
      },
      ts: 1,
    },
  ];

  it('console: لاگ می‌کند و موفق است', () => {
    const log = vi.fn();
    const ad = createConsoleAdapter(log);
    expect(ad.send(batch)).toBe(true);
    expect(log).toHaveBeenCalledOnce();
  });

  it('noop: همیشه موفق (صف در نبود سرور رشد نمی‌کند)', () => {
    expect(createNoopAdapter().send()).toBe(true);
  });

  it('http: اول sendBeacon؛ موفق → بدون fetch', () => {
    const beacon = { sendBeacon: vi.fn().mockReturnValue(true) };
    const fetchFn = vi.fn();
    const ad = createHttpAdapter('https://api.example/v1/events', {
      beacon,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(ad.send(batch)).toBe(true);
    expect(beacon.sendBeacon).toHaveBeenCalledWith(
      'https://api.example/v1/events',
      JSON.stringify({ events: batch }),
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('http: شکست beacon → فالبک fetch با keepalive؛ پاسخ ok=true', async () => {
    const beacon = { sendBeacon: vi.fn().mockReturnValue(false) };
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const ad = createHttpAdapter('https://api.example/v1/events', {
      beacon,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await expect(ad.send(batch)).resolves.toBe(true);
    const call = fetchFn.mock.calls[0]!;
    expect(call[0]).toBe('https://api.example/v1/events');
    expect(call[1]).toMatchObject({ method: 'POST', keepalive: true });
  });

  it('http: پرتاب beacon + خطای fetch → false (صف می‌ماند)', async () => {
    const beacon = {
      sendBeacon: vi.fn(() => {
        throw new Error('csp');
      }),
    };
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const ad = createHttpAdapter('https://x/e', {
      beacon,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await expect(ad.send(batch)).resolves.toBe(false);
  });

  it('http: پاسخ غیر ok → false', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false });
    const ad = createHttpAdapter('https://x/e', {
      beacon: {},
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await expect(ad.send(batch)).resolves.toBe(false);
  });

  it('resolveAdapter: آداپتور صریح > endpoint > dev-console', () => {
    const explicit = createNoopAdapter();
    expect(resolveAdapter({ adapter: explicit })).toBe(explicit);
    expect(resolveAdapter({ endpoint: 'https://x/e' }).name).toBe('http');
    // در محیط تست (NODE_ENV=test → dev) بدون endpoint، console انتخاب می‌شود
    expect(['console', 'noop']).toContain(resolveAdapter({}).name);
  });
});

describe('سلامت کلمه (گزارش برای AI-02)', () => {
  const wire = (payload: Record<string, unknown>): WireEvent => ({
    event: 'puzzle_finished',
    payload,
    meta: {
      anonId: 'a',
      sessionId: 's',
      appVersion: '1',
      platform: 't',
      locale: 'fa',
      installWeek: '2026-W36',
      seq: 1,
    },
    ts: 1,
  });

  it('puzzleNumberFromId فقط daily را می‌پذیرد', () => {
    expect(puzzleNumberFromId('daily-812')).toBe(812);
    expect(puzzleNumberFromId('practice-42')).toBeNull();
    expect(puzzleNumberFromId('bogus')).toBeNull();
  });

  it('میانگین حدس/نرخ باخت هر puzzleNumber + پرچم سختی', () => {
    const events = [
      // #1: دو برد (۳ و ۵ حدس)، بدون باخت → ok
      wire({ puzzleId: 'daily-1', won: true, guessCount: 3, durationMs: 30_000 }),
      wire({ puzzleId: 'daily-1', won: true, guessCount: 5, durationMs: 60_000 }),
      // #2: یک برد، دو باخت → lossRate=0.67 → very_hard
      wire({ puzzleId: 'daily-2', won: true, guessCount: 6, durationMs: 100_000 }),
      wire({ puzzleId: 'daily-2', won: false, guessCount: 6, durationMs: 120_000 }),
      wire({ puzzleId: 'daily-2', won: false, guessCount: 6, durationMs: 110_000 }),
      // نویز: تمرینی و رویداد دیگر — نادیده
      wire({ puzzleId: 'practice-9', won: false, guessCount: 6, durationMs: 1 }),
      { ...wire({ puzzleId: 'daily-1' }), event: 'screen_viewed' },
    ];
    const rows = aggregateWordHealth(events);
    expect(rows).toHaveLength(2);
    const r1 = rows[0]!;
    expect(r1).toMatchObject({ puzzleNumber: 1, plays: 2, wins: 2, losses: 0, flag: 'ok' });
    expect(r1.avgGuessCount).toBe(4);
    const r2 = rows[1]!;
    expect(r2).toMatchObject({ puzzleNumber: 2, plays: 3, wins: 1, losses: 2, flag: 'very_hard' });
    expect(r2.lossRate).toBeCloseTo(0.67, 2);
  });

  it('گزارش md شامل جدول و پرچم‌هاست', () => {
    const rows = aggregateWordHealth([
      wire({ puzzleId: 'daily-5', won: false, guessCount: 6, durationMs: 1000 }),
    ]);
    const md = renderWordHealthReport(rows, '2026-W36');
    expect(md).toContain('گزارش هفتگی سلامت کلمه');
    expect(md).toContain('2026-W36');
    expect(md).toContain('| 5 |');
    expect(md).toContain('very_hard');
    expect(md).toContain('نیاز به بازبینی');
    const empty = renderWordHealthReport([], '2026-W37');
    expect(empty).toContain('محدوده‌ی سالم');
  });
});
