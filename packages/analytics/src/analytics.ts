/**
 * هسته‌ی @dordaneh/analytics — پیاده‌سازی AnalyticsApi قرارداد (docs/02_CONTRACTS.md §8).
 *
 * معماری: track → غنی‌سازی متادیتای ناشناس → گارد ضد-PII → صف آفلاین در Storage
 * ('dor.analytics.queue') → flush دسته‌ای (۲۰ رویداد / ۳۰ثانیه / visibilitychange)
 * → آداپتور (sendBeacon → fetch → console/noop). شکست شبکه = ماندن در صف
 * (سقف ۵۰۰، FIFO). هیچ خطایی هرگز به اپ نشت نمی‌کند (fail-soft, آفلاین-اول).
 */

import type { AnalyticsApi, AppEvent, StorageApi } from '@dordaneh/contracts';
import { STORAGE_KEYS } from '@dordaneh/contracts';
import { resolveAdapter, readEnv } from './adapters';
import { bucketVariant, uuidV4 } from './hash';
import { sanitizePayload } from './privacy';
import type {
  AnalyticsOptions,
  DordanehAnalytics,
  EventMeta,
  TransportAdapter,
  WireEvent,
} from './types';

export const DEFAULT_BATCH_SIZE = 20;
export const DEFAULT_FLUSH_INTERVAL_MS = 30_000;
export const MAX_QUEUE = 500;
export const CONFIG_TTL_MS = 24 * 60 * 60 * 1000; // کش ۲۴ساعته remote config

/** کلیدهای Storage اختصاصی این پکیج (queue کلید رزروشده‌ی قرارداد است). */
const KEY_QUEUE: string = STORAGE_KEYS.analyticsQueue; // 'dor.analytics.queue'
const KEY_ANON = 'dor.analytics.anonId';
const KEY_INSTALL_WEEK = 'dor.analytics.installWeek';
const KEY_CONFIG_CACHE = 'dor.analytics.config';

interface ConfigCache {
  fetchedAt: number;
  values: Record<string, unknown>;
}

/** برچسب هفته‌ی ISO-مانند 'YYYY-Www' برای کوهورت نصب — بدون وابستگی. */
export function weekLabel(epochMs: number): string {
  const d = new Date(epochMs);
  // الگوریتم هفته‌ی ISO 8601 (پنجشنبه‌ی همان هفته تعیین‌کننده‌ی سال است)
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function createAnalytics(options: AnalyticsOptions): DordanehAnalytics & AnalyticsApi {
  const storage: StorageApi = options.storage;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
  const maxQueue = options.maxQueue ?? MAX_QUEUE;
  const adapter: TransportAdapter = resolveAdapter(options);

  // ---------- هویت ناشناس پایدار (خط قرمز ۱۴: UUID محلی، بدون ثبت‌نام) ----------
  let anonId = storage.get<string>(KEY_ANON);
  if (!anonId) {
    anonId = uuidV4(random);
    storage.set(KEY_ANON, anonId);
  }
  let installWeek = storage.get<string>(KEY_INSTALL_WEEK);
  if (!installWeek) {
    installWeek = weekLabel(now());
    storage.set(KEY_INSTALL_WEEK, installWeek);
  }

  const sessionId = uuidV4(random);
  let seq = 0;

  const meta = (): EventMeta => ({
    anonId: anonId as string,
    sessionId,
    appVersion: options.appVersion ?? readEnv('VITE_APP_VERSION') ?? '0.0.0',
    platform: options.platform ?? detectPlatform(),
    locale: options.locale ?? detectLocale(),
    installWeek: installWeek as string,
    seq,
  });

  // ---------- صف آفلاین ----------
  const readQueue = (): WireEvent[] => storage.get<WireEvent[]>(KEY_QUEUE) ?? [];
  const writeQueue = (q: WireEvent[]): void => storage.set(KEY_QUEUE, q);

  function enqueue(record: WireEvent): void {
    const q = readQueue();
    q.push(record);
    // سقف ۵۰۰ — FIFO: قدیمی‌ترین‌ها حذف می‌شوند
    while (q.length > maxQueue) q.shift();
    writeQueue(q);
    if (q.length >= batchSize) void flush();
  }

  // ---------- flush دسته‌ای ----------
  // اگر flush در جریان است، همان promise را برمی‌گردانیم تا caller واقعاً منتظر تخلیه بماند
  let inflight: Promise<void> | null = null;
  function flush(): Promise<void> {
    if (inflight) return inflight;
    inflight = doFlush().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function doFlush(): Promise<void> {
    // در هر flush دسته‌های حداکثر batchSize پیاپی می‌فرستیم تا صف کاملاً تخلیه شود
    for (;;) {
      const q = readQueue();
      if (q.length === 0) return;
      const batch = q.slice(0, batchSize);
      let ok = false;
      try {
        ok = await adapter.send(batch);
      } catch {
        ok = false; // شکست شبکه = نگه‌داشتن در صف
      }
      if (!ok) return;
      // فقط پس از موفقیت حذف می‌کنیم؛ صف ممکن است حین ارسال رشد کرده باشد
      const rest = readQueue().slice(batch.length);
      writeQueue(rest);
    }
  }

  // ---------- تایمر دوره‌ای + visibilitychange ----------
  const timer: ReturnType<typeof setInterval> | null =
    flushIntervalMs > 0 ? setInterval(() => void flush(), flushIntervalMs) : null;
  // تایمر نباید فرایند Node (تست) را زنده نگه دارد
  if (timer && typeof (timer as { unref?: () => void }).unref === 'function') {
    (timer as unknown as { unref(): void }).unref();
  }

  const doc =
    options.doc !== undefined
      ? options.doc
      : ((globalThis as { document?: AnalyticsOptions['doc'] }).document ?? null);
  const onVisibility = (): void => {
    if (!doc || doc.visibilityState === 'hidden') void flush();
  };
  if (doc) doc.addEventListener('visibilitychange', onVisibility);

  // ---------- remote config (کش ۲۴ساعته + fallback همیشگی) ----------
  const configUrl =
    options.configUrl ?? readEnv('VITE_ANALYTICS_CONFIG_URL') ?? readEnv('DOR_CONFIG_URL');
  let refreshing = false;

  function refreshConfig(): void {
    if (!configUrl || refreshing) return;
    const fetchFn = options.fetchFn ?? (globalThis as { fetch?: typeof fetch }).fetch;
    if (!fetchFn) return;
    refreshing = true;
    void fetchFn(configUrl, { headers: { accept: 'application/json' } })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as Record<string, unknown> | null;
        if (json && typeof json === 'object') {
          const cache: ConfigCache = { fetchedAt: now(), values: json };
          storage.set(KEY_CONFIG_CACHE, cache);
        }
      })
      .catch(() => {
        /* آفلاین/خطا: کش قبلی و fallback کافی‌اند — اپ هرگز منتظر config نمی‌ماند */
      })
      .finally(() => {
        refreshing = false;
      });
  }

  function getRemoteConfig<T>(key: string, fallback: T): T {
    const cache = storage.get<ConfigCache>(KEY_CONFIG_CACHE);
    const fresh = cache !== null && now() - cache.fetchedAt < CONFIG_TTL_MS;
    if (!fresh) refreshConfig(); // به‌روزرسانی در پس‌زمینه — همین حالا مقدار sync برمی‌گردد
    if (cache && Object.prototype.hasOwnProperty.call(cache.values, key)) {
      return cache.values[key] as T;
    }
    return fallback;
  }

  // ---------- A/B قطعی ----------
  const exposed = new Set<string>();
  function getVariant(experimentId: string): 'A' | 'B' {
    const variant = bucketVariant(anonId as string, experimentId);
    // رویداد exposure یک‌بار در هر جلسه — چون 'experiment_exposed' هنوز در
    // AppEvent قرارداد نیست (→ RFC-0012)، تا تأیید در قالب سیمی ژنریک می‌فرستیم.
    if (!exposed.has(experimentId)) {
      exposed.add(experimentId);
      trackWire('experiment_exposed', { experimentId, variant });
    }
    return variant;
  }

  // ---------- track ----------
  function trackWire(event: string, payload: Record<string, unknown>): void {
    try {
      seq += 1;
      const record: WireEvent = {
        event,
        payload: sanitizePayload(payload),
        meta: meta(),
        ts: now(),
      };
      enqueue(record);
    } catch {
      /* آنالیتیکس هرگز اپ را نمی‌شکند */
    }
  }

  function track(e: AppEvent): void {
    const { type, ...rest } = e;
    trackWire(type, rest as Record<string, unknown>);
  }

  function dispose(): void {
    if (timer) clearInterval(timer);
    if (doc) doc.removeEventListener('visibilitychange', onVisibility);
  }

  return { track, getRemoteConfig, getVariant, flush, dispose, getMeta: meta };
}

function detectPlatform(): string {
  const nav = (globalThis as { navigator?: { userAgent?: string } }).navigator;
  const ua = nav?.userAgent ?? '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (ua) return 'web';
  return 'node';
}

function detectLocale(): string {
  const nav = (globalThis as { navigator?: { language?: string } }).navigator;
  return nav?.language ?? 'fa-IR';
}
