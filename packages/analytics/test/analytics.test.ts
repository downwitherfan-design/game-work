/**
 * تست هسته‌ی آنالیتیکس: صف آفلاین، ارسال دسته‌ای، متادیتا، remote config.
 */
import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorage, STORAGE_KEYS } from '@dordaneh/contracts';
import type { AppEvent } from '@dordaneh/contracts';
import {
  createAnalytics,
  weekLabel,
  MAX_QUEUE,
  CONFIG_TTL_MS,
} from '../src/analytics';
import type { TransportAdapter, WireEvent, DocumentLike } from '../src/types';

function makeAdapter(sendImpl?: TransportAdapter['send']) {
  const sent: WireEvent[][] = [];
  const adapter: TransportAdapter = {
    name: 'test',
    send(batch) {
      sent.push([...batch]);
      return sendImpl ? sendImpl(batch) : true;
    },
  };
  return { adapter, sent };
}

const baseOpts = (storage = createMemoryStorage()) => ({
  storage,
  appVersion: '1.2.3',
  platform: 'test',
  locale: 'fa-IR',
  flushIntervalMs: 0, // بدون تایمر در تست
  doc: null,
});

const ev = (over?: Partial<Extract<AppEvent, { type: 'screen_viewed' }>>): AppEvent => ({
  type: 'screen_viewed',
  screen: 'home',
  ...over,
});

/** تخلیه‌ی کامل microtaskها با یک macro-task */
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

describe('createAnalytics — صف آفلاین و متادیتا', () => {
  it('رویداد را با متادیتای ناشناس غنی‌سازی و در dor.analytics.queue صف می‌کند', () => {
    const storage = createMemoryStorage();
    const { adapter } = makeAdapter();
    const a = createAnalytics({ ...baseOpts(storage), adapter });

    a.track(ev());
    const q = storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue);
    expect(q).toHaveLength(1);
    const rec = q![0]!;
    expect(rec.event).toBe('screen_viewed');
    expect(rec.payload).toEqual({ screen: 'home' });
    expect(rec.meta.anonId).toMatch(/^[0-9a-f-]{36}$/);
    expect(rec.meta.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(rec.meta.appVersion).toBe('1.2.3');
    expect(rec.meta.platform).toBe('test');
    expect(rec.meta.locale).toBe('fa-IR');
    expect(rec.meta.installWeek).toMatch(/^\d{4}-W\d{2}$/);
    expect(rec.meta.seq).toBe(1);
    a.dispose();
  });

  it('anonId و installWeek بین جلسات پایدارند؛ sessionId هر جلسه نو است', () => {
    const storage = createMemoryStorage();
    const a1 = createAnalytics({ ...baseOpts(storage), adapter: makeAdapter().adapter });
    const m1 = a1.getMeta();
    a1.dispose();
    const a2 = createAnalytics({ ...baseOpts(storage), adapter: makeAdapter().adapter });
    const m2 = a2.getMeta();
    a2.dispose();
    expect(m2.anonId).toBe(m1.anonId);
    expect(m2.installWeek).toBe(m1.installWeek);
    expect(m2.sessionId).not.toBe(m1.sessionId);
  });

  it('در آستانه‌ی batchSize به‌صورت خودکار flush می‌کند', async () => {
    const storage = createMemoryStorage();
    const { adapter, sent } = makeAdapter();
    const a = createAnalytics({ ...baseOpts(storage), adapter, batchSize: 3 });
    a.track(ev());
    a.track(ev());
    expect(sent).toHaveLength(0); // زیر آستانه
    a.track(ev());
    await a.flush(); // اطمینان از اتمام async
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(sent[0]).toHaveLength(3);
    expect(storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)).toEqual([]);
    a.dispose();
  });

  it('شکست شبکه = رویدادها در صف می‌مانند (سپس ارسال موفق صف را خالی می‌کند)', async () => {
    const storage = createMemoryStorage();
    let ok = false;
    const { adapter, sent } = makeAdapter(() => ok);
    const a = createAnalytics({ ...baseOpts(storage), adapter, batchSize: 100 });
    a.track(ev());
    a.track(ev());
    await a.flush();
    expect(sent).toHaveLength(1);
    expect(storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)).toHaveLength(2); // ماند
    ok = true;
    await a.flush();
    expect(storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)).toEqual([]); // خالی شد
    a.dispose();
  });

  it('خطای پرتاب‌شده از adapter را می‌بلعد و صف را نگه می‌دارد (fail-soft)', async () => {
    const storage = createMemoryStorage();
    const adapter: TransportAdapter = {
      name: 'boom',
      send() {
        throw new Error('network down');
      },
    };
    const a = createAnalytics({ ...baseOpts(storage), adapter, batchSize: 100 });
    a.track(ev());
    await expect(a.flush()).resolves.toBeUndefined();
    expect(storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)).toHaveLength(1);
    a.dispose();
  });

  it('سقف صف FIFO ۵۰۰ — قدیمی‌ترین‌ها حذف می‌شوند', () => {
    const storage = createMemoryStorage();
    const { adapter } = makeAdapter(() => false); // ارسال ناموفق تا صف پر شود
    const a = createAnalytics({ ...baseOpts(storage), adapter, batchSize: 10_000 });
    for (let i = 0; i < MAX_QUEUE + 25; i++) {
      a.track({ type: 'guess_submitted', puzzleId: 'daily-1', guessIndex: i });
    }
    const q = storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)!;
    expect(q).toHaveLength(MAX_QUEUE);
    expect((q[0]!.payload as { guessIndex: number }).guessIndex).toBe(25); // FIFO
    a.dispose();
  });

  it('صف بزرگ را در چند دسته‌ی پیاپی تخلیه می‌کند', async () => {
    const storage = createMemoryStorage();
    const { adapter, sent } = makeAdapter();
    const a = createAnalytics({ ...baseOpts(storage), adapter, batchSize: 20, maxQueue: 500 });
    // مستقیم صف را پر می‌کنیم تا auto-flush آستانه‌ای دخالت نکند
    for (let i = 0; i < 45; i++) a.track(ev());
    await a.flush();
    const total = sent.reduce((s, b) => s + b.length, 0);
    expect(total).toBe(45);
    expect(storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)).toEqual([]);
    a.dispose();
  });

  it('تایمر دوره‌ای flush می‌کند (fake timers)', async () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const { adapter, sent } = makeAdapter();
    const a = createAnalytics({
      storage,
      adapter,
      appVersion: '1',
      platform: 't',
      locale: 'fa',
      batchSize: 100,
      flushIntervalMs: 30_000,
      doc: null,
    });
    a.track(ev());
    expect(sent).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sent).toHaveLength(1);
    a.dispose();
    vi.useRealTimers();
  });

  it('روی visibilitychange (hidden) flush می‌کند', async () => {
    const listeners = new Map<string, () => void>();
    const doc: DocumentLike = {
      visibilityState: 'hidden',
      addEventListener: (t, cb) => listeners.set(t, cb),
      removeEventListener: (t) => listeners.delete(t),
    };
    const storage = createMemoryStorage();
    const { adapter, sent } = makeAdapter();
    const a = createAnalytics({ ...baseOpts(storage), adapter, doc, batchSize: 100 });
    a.track(ev());
    listeners.get('visibilitychange')!();
    await a.flush();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    a.dispose();
    expect(listeners.has('visibilitychange')).toBe(false); // dispose پاک کرد
  });
});

describe('getRemoteConfig — کش ۲۴ساعته + fallback همیشگی', () => {
  it('بدون کش و بدون شبکه، بلافاصله fallback برمی‌گرداند (اپ منتظر نمی‌ماند)', () => {
    const a = createAnalytics({ ...baseOpts(), adapter: makeAdapter().adapter });
    expect(a.getRemoteConfig('feature.duel', false)).toBe(false);
    expect(a.getRemoteConfig('notifHour', 19)).toBe(19);
    a.dispose();
  });

  it('config را fetch و کش می‌کند؛ فراخوانی بعدی مقدار کش را sync می‌دهد', async () => {
    const storage = createMemoryStorage();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notifHour: 21, 'feature.duel': true }),
    });
    const a = createAnalytics({
      ...baseOpts(storage),
      adapter: makeAdapter().adapter,
      configUrl: 'https://cdn.example/config-v1.json',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(a.getRemoteConfig('notifHour', 9)).toBe(9); // اولین بار: fallback + refresh پس‌زمینه
    await settle();
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(a.getRemoteConfig('notifHour', 9)).toBe(21); // حالا از کش
    expect(a.getRemoteConfig('feature.duel', false)).toBe(true);
    expect(a.getRemoteConfig('missing.key', 'fb')).toBe('fb'); // کلید غایب → fallback
    a.dispose();
  });

  it('کش تازه (< ۲۴h) دوباره fetch نمی‌کند؛ کش کهنه refresh می‌شود اما مقدار کهنه را sync می‌دهد', async () => {
    const storage = createMemoryStorage();
    let t = 1_000_000;
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ k: 'fresh' }),
    });
    const a = createAnalytics({
      ...baseOpts(storage),
      adapter: makeAdapter().adapter,
      configUrl: 'https://cdn.example/c.json',
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => t,
    });
    a.getRemoteConfig('k', 'fb');
    await settle();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(a.getRemoteConfig('k', 'fb')).toBe('fresh');
    expect(fetchFn).toHaveBeenCalledTimes(1); // کش تازه — بدون fetch مجدد

    t += CONFIG_TTL_MS + 1; // کش کهنه شد
    expect(a.getRemoteConfig('k', 'fb')).toBe('fresh'); // مقدار کهنه sync، refresh پس‌زمینه
    await settle();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    a.dispose();
  });

  it('خطای شبکه در refresh بی‌صدا بلعیده می‌شود', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const a = createAnalytics({
      ...baseOpts(),
      adapter: makeAdapter().adapter,
      configUrl: 'https://cdn.example/c.json',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(a.getRemoteConfig('k', 'safe')).toBe('safe');
    await settle();
    expect(a.getRemoteConfig('k', 'safe')).toBe('safe'); // هنوز fallback — بدون کرش
    a.dispose();
  });
});

describe('weekLabel — برچسب کوهورت هفته‌ی نصب', () => {
  it('قالب YYYY-Www و قطعی است', () => {
    expect(weekLabel(Date.UTC(2026, 8, 1))).toMatch(/^\d{4}-W\d{2}$/);
    expect(weekLabel(Date.UTC(2026, 8, 1))).toBe(weekLabel(Date.UTC(2026, 8, 1)));
    // دو روز از یک هفته → یک برچسب
    expect(weekLabel(Date.UTC(2026, 0, 5))).toBe(weekLabel(Date.UTC(2026, 0, 9)));
    // هفته‌های متفاوت → برچسب متفاوت
    expect(weekLabel(Date.UTC(2026, 0, 5))).not.toBe(weekLabel(Date.UTC(2026, 0, 19)));
  });
});
