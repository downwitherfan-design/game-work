/**
 * @dordaneh/duel-mode — کلاینت HTTP دوئل، دقیقاً طبق قرارداد §7.
 * سرور مال AI-09 است؛ ما فقط fetch می‌زنیم. همه‌ی خطاها silent-degrade
 * (اپ آفلاین-اول — docs/02_CONTRACTS.md §7).
 */

import type {
  ApiResponse,
  DuelCreateBody,
  DuelCreateData,
  DuelResultBody,
  DuelResultData,
  DuelStateData,
} from '@dordaneh/contracts';
import type { DuelApi } from './types';

export interface DuelApiConfig {
  /** Base قرارداد: https://api.<domain>/v1 */
  baseUrl: string;
  /** تزریق fetch برای تست‌پذیری؛ پیش‌فرض: fetch سراسری */
  fetchFn?: typeof fetch;
  /** timeout هر درخواست (پیش‌فرض ۱۰ ثانیه — مناسب اینترنت ایران) */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** پاسخ شکست یکنواخت برای silent-degrade */
function failure<T>(error: string): ApiResponse<T> {
  return { ok: false, error };
}

async function request<T>(
  cfg: Required<Pick<DuelApiConfig, 'baseUrl' | 'timeoutMs'>> & { fetchFn: typeof fetch },
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await cfg.fetchFn(`${cfg.baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return failure(`HTTP_${res.status}`);
    const json = (await res.json()) as ApiResponse<T>;
    if (typeof json?.ok !== 'boolean') return failure('BAD_RESPONSE');
    return json;
  } catch {
    // خطای شبکه/timeout — هرگز throw نمی‌کنیم (offline-first)
    return failure('NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

/** ساخت کلاینت واقعی REST دوئل */
export function createDuelApi(config: DuelApiConfig): DuelApi {
  const cfg = {
    baseUrl: config.baseUrl.replace(/\/$/, ''),
    fetchFn: config.fetchFn ?? fetch,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
  return {
    createDuel(anonId, name): Promise<ApiResponse<DuelCreateData>> {
      const body: DuelCreateBody = { anonId, name };
      return request<DuelCreateData>(cfg, 'POST', '/duel', body);
    },
    submitResult(duelId, anonId, guessCount, durationMs): Promise<ApiResponse<DuelResultData>> {
      const body: DuelResultBody = { anonId, guessCount, durationMs };
      return request<DuelResultData>(cfg, 'POST', `/duel/${encodeURIComponent(duelId)}/result`, body);
    },
    getDuel(duelId): Promise<ApiResponse<DuelStateData>> {
      return request<DuelStateData>(cfg, 'GET', `/duel/${encodeURIComponent(duelId)}`);
    },
  };
}

/**
 * انتخاب کلاینت با سوییچ env:
 * - `mode: 'mock'` (پیش‌فرض تا آماده‌شدن سرور AI-09) → mock درون‌حافظه‌ای
 * - `mode: 'real'` + baseUrl → سرور واقعی
 */
export async function resolveDuelApi(opts: {
  mode: 'mock' | 'real';
  baseUrl?: string;
}): Promise<DuelApi> {
  if (opts.mode === 'real' && opts.baseUrl) {
    return createDuelApi({ baseUrl: opts.baseUrl });
  }
  const { createMockDuelApi } = await import('./mocks/duel-api.mock');
  return createMockDuelApi();
}
