/**
 * @dordaneh/backend-api — مالک: AI-09. پیاده‌سازی طبق docs/02_CONTRACTS.md §7.
 * Worker entry برای Cloudflare (wrangler) + exportهای عمومی برای تست/ابزار.
 */

import { createApp } from './app';

export { createApp, ERR } from './app';
export type { Env, D1Database, D1PreparedStatement, D1Result } from './d1-types';
export {
  computeScore,
  dailyChecksum,
  defaultName,
  isPlausibleResult,
  isValidAnonId,
  isValidPuzzleNumber,
  sanitizeName,
  shortId,
  randomSeed,
  MAX_NAME_LENGTH,
  MIN_WIN_DURATION_MS,
} from './util';
export { RATE_RULES, checkRateLimit } from './rate-limit';

const app = createApp();

export default app;
