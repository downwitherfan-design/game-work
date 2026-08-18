/**
 * آداپتورهای مقصد ارسال — قابل‌پیکربندی با env (بدون وابستگی؛ fetch/sendBeacon بومی).
 *
 * انتخاب مقصد:
 *  - endpoint صریح در options → آداپتور HTTP (sendBeacon → فالبک fetch)
 *  - env: VITE_ANALYTICS_ENDPOINT / DOR_ANALYTICS_ENDPOINT → HTTP
 *  - حالت dev (env.DEV یا NODE_ENV!=='production') → console
 *  - در غیر این صورت → noop خنثی (تا وقتی endpoint سرور AI-09 با RFC قطعی شود)
 */

import type { TransportAdapter, WireEvent } from './types';

/** خواندن env به‌صورت ایمن در Vite/Node/مرورگر — بدون کرش. */
export function readEnv(name: string): string | undefined {
  // Vite: import.meta.env — دسترسی داخل try چون در Node خالص ممکن است نباشد
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (metaEnv && typeof metaEnv[name] === 'string') return metaEnv[name];
  } catch {
    /* import.meta.env در دسترس نیست */
  }
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process;
    if (proc?.env && typeof proc.env[name] === 'string') return proc.env[name];
  } catch {
    /* process در دسترس نیست */
  }
  return undefined;
}

export function isDevEnv(): boolean {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    if (metaEnv && typeof metaEnv['DEV'] === 'boolean') return metaEnv['DEV'] as boolean;
  } catch {
    /* ignore */
  }
  const nodeEnv = readEnv('NODE_ENV');
  return nodeEnv !== undefined && nodeEnv !== 'production';
}

/** آداپتور dev: چاپ خوانا در کنسول؛ همیشه موفق. */
export function createConsoleAdapter(
  // eslint-disable-next-line no-console -- کارکرد این آداپتور دقیقاً لاگ کنسول در dev است
  log: (...args: unknown[]) => void = console.debug.bind(console),
): TransportAdapter {
  return {
    name: 'console',
    send(batch: readonly WireEvent[]): boolean {
      log(`[dor-analytics] batch × ${batch.length}`, batch);
      return true;
    },
  };
}

/** آداپتور خنثی: دسته را «پذیرفته» اعلام می‌کند تا صف در نبود سرور بی‌نهایت رشد نکند. */
export function createNoopAdapter(): TransportAdapter {
  return {
    name: 'noop',
    send(): boolean {
      return true;
    },
  };
}

interface BeaconLike {
  sendBeacon?(url: string, data: string): boolean;
}

/**
 * آداپتور تولید: POST /events — اول navigator.sendBeacon (تحویل تضمینی هنگام
 * خروج صفحه)، فالبک fetch با keepalive. شکست شبکه → false (رویدادها در صف می‌مانند).
 */
export function createHttpAdapter(
  endpoint: string,
  deps?: { fetchFn?: typeof fetch; beacon?: BeaconLike },
): TransportAdapter {
  return {
    name: 'http',
    send(batch: readonly WireEvent[]): boolean | Promise<boolean> {
      const body = JSON.stringify({ events: batch });

      const beacon =
        deps?.beacon ??
        ((globalThis as { navigator?: BeaconLike }).navigator satisfies
          | BeaconLike
          | undefined);
      if (beacon?.sendBeacon) {
        try {
          if (beacon.sendBeacon(endpoint, body)) return true;
        } catch {
          /* فالبک fetch */
        }
      }

      const fetchFn = deps?.fetchFn ?? (globalThis as { fetch?: typeof fetch }).fetch;
      if (!fetchFn) return false; // بدون شبکه‌ای — silent degrade (خط قرمز آفلاین-اول)

      return fetchFn(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      })
        .then((res) => res.ok)
        .catch(() => false);
    },
  };
}

/** انتخاب آداپتور بر اساس options/env — ترتیب اولویت در سرصفحه‌ی فایل. */
export function resolveAdapter(opts: {
  adapter?: TransportAdapter;
  endpoint?: string;
  fetchFn?: typeof fetch;
}): TransportAdapter {
  if (opts.adapter) return opts.adapter;
  const endpoint =
    opts.endpoint ?? readEnv('VITE_ANALYTICS_ENDPOINT') ?? readEnv('DOR_ANALYTICS_ENDPOINT');
  if (endpoint) return createHttpAdapter(endpoint, { fetchFn: opts.fetchFn });
  if (isDevEnv()) return createConsoleAdapter();
  return createNoopAdapter();
}
