/**
 * @dordaneh/duel-mode — «سری دوئل»: برد-باخت تجمعی با یک حریف ثابت.
 * رابطه‌ی رقابتی ادامه‌دار = trigger بازگشت (Hooked, Eyal 2014).
 * ذخیره‌ی محلی — هیچ داده‌ی شخصی؛ فقط نام نمایشی حریف.
 */

import type { StorageApi } from '@dordaneh/contracts';
import type { DuelSeriesMap, DuelSeriesRecord, DuelVerdict } from './types';

/** خواندن سری با یک حریف (null = هنوز سری‌ای وجود ندارد) */
export function getSeries(
  storage: StorageApi,
  storageKey: string,
  opponentName: string,
): DuelSeriesRecord | null {
  const map = storage.get<DuelSeriesMap>(storageKey);
  return map?.[opponentName] ?? null;
}

/** ثبت نتیجه‌ی یک دوئل در سری حریف */
export function recordSeriesResult(
  storage: StorageApi,
  storageKey: string,
  opponentName: string,
  verdict: DuelVerdict,
  atMs: number,
): DuelSeriesRecord {
  const map = storage.get<DuelSeriesMap>(storageKey) ?? {};
  const prev = map[opponentName] ?? {
    opponentName,
    wins: 0,
    losses: 0,
    draws: 0,
    lastDuelAt: 0,
  };
  const next: DuelSeriesRecord = {
    ...prev,
    wins: prev.wins + (verdict === 'win' ? 1 : 0),
    losses: prev.losses + (verdict === 'loss' ? 1 : 0),
    draws: prev.draws + (verdict === 'draw' ? 1 : 0),
    lastDuelAt: atMs,
  };
  map[opponentName] = next;
  storage.set(storageKey, map);
  return next;
}
