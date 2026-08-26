/**
 * @dordaneh/analytics — رصد داده و رشد (مالک: AI-12).
 * پیاده‌سازی AnalyticsApi طبق docs/02_CONTRACTS.md §8.
 *
 * «با داده رشد کن» — اما حریم خصوصی اول (خط قرمز ۲۸: صفر PII).
 * صفر وابستگی (فقط @dordaneh/contracts). بودجه‌ی حجم: ≤ ۵KB gzip.
 *
 * استفاده (فقط app-shell — قرارداد §8):
 *   const analytics = createAnalytics({ storage });
 *   const unwire = wireAnalyticsToBus(bus, analytics);
 */

export { createAnalytics, weekLabel, DEFAULT_BATCH_SIZE, DEFAULT_FLUSH_INTERVAL_MS, MAX_QUEUE, CONFIG_TTL_MS } from './analytics';
export { wireAnalyticsToBus, ALL_APP_EVENT_TYPES } from './wiring';
export {
  createConsoleAdapter,
  createHttpAdapter,
  createNoopAdapter,
  resolveAdapter,
} from './adapters';
export { bucketVariant, fnv1a32, uuidV4 } from './hash';
export { sanitizePayload, isPiiFieldName, looksLikePiiValue } from './privacy';
export {
  aggregateWordHealth,
  renderWordHealthReport,
  puzzleNumberFromId,
  HARD_LOSS_RATE,
  VERY_HARD_LOSS_RATE,
  HARD_AVG_GUESS,
} from './word-health';
export { EXP_SHARE_CTA, EXP_NOTIF_HOUR, resolveExperiment } from './experiments';
export type {
  AnalyticsOptions,
  DordanehAnalytics,
  EventMeta,
  TransportAdapter,
  WireEvent,
  DocumentLike,
} from './types';
export type { WordHealthRow } from './word-health';
export type { ExperimentDef } from './experiments';
