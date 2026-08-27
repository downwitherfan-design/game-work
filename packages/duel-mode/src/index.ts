/**
 * @dordaneh/duel-mode — دوئل ناهمزمان ۱به۱ (مالک: AI-10).
 * فیچر فاز ۲ — پشت فلگ `duel` (پیش‌فرض خاموش).
 * صادرات رسمی طبق قرارداد §6: DuelScreen برای route «/duel/*».
 */

// کامپوننت صفحه (قرارداد §6 — app-shell روت می‌کند)
export { DuelScreen } from './DuelScreen';
export type { DuelScreenProps } from './DuelScreen';

// ماشین حالت — app-shell با storage/bus/env واقعی wire می‌کند
export { createDuelStore, seedFromDuelId, DUEL_STORAGE_KEYS } from './store';
export type { DuelStore, DuelStoreDeps } from './store';

// کلاینت REST قرارداد §7 + سوییچ mock/real با env
export { createDuelApi, resolveDuelApi } from './api';
export type { DuelApiConfig } from './api';
export { createMockDuelApi } from './mocks/duel-api.mock';
export type { MockDuelApiOptions } from './mocks/duel-api.mock';

// منطق خالص (تست‌پذیر، بدون DOM/شبکه)
export {
  DUEL_TTL_MS,
  DUEL_POLL_INTERVAL_MS,
  decideVerdict,
  isDuelExpired,
  outcomeFromPuzzleState,
  canRevealOpponent,
  buildDuelComparisonGrid,
  generateAnonId,
  defaultPlayerName,
  parseDuelPath,
} from './logic';

// سری دوئل (برد-باخت تجمعی با حریف ثابت)
export { getSeries, recordSeriesResult } from './series';

// تایپ‌های عمومی
export { DUEL_DNF } from './types';
export type {
  DuelApi,
  DuelPhase,
  DuelViewState,
  DuelVerdict,
  DuelOutcomeInput,
  DuelSeriesRecord,
  DuelSeriesMap,
  DuelBoardSlotProps,
} from './types';

/** نام فلگ فیچر دوئل — پیش‌فرض خاموش تا فاز ۲ (remote config قرارداد §8) */
export const DUEL_FEATURE_FLAG = 'duel';
