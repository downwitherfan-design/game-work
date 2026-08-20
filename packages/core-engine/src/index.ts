/**
 * @dordaneh/core-engine — مالک: AI-01. منطق خالص و قطعی بازی دُردانه.
 * پیاده‌سازی کامل EngineApi از docs/02_CONTRACTS.md §1.
 *
 * بدون DOM · بدون شبکه · بدون side effect · تنها منبع تصادف: seed ورودی.
 */

// موتور اصلی (EngineApi + کارخانه با تزریق وابستگی word-db)
export {
  createEngine,
  DAILY_WORD_LENGTH,
  MAX_GUESSES,
  ONBOARDING_PUZZLE_ID,
  type EngineOptions,
} from './engine';

// الگوریتم ارزیابی حدس (دو-گذری، مدیریت حروف تکراری)
export { evaluateGuessAgainst, isWinningEvaluation } from './evaluate-guess';

// ماشین حالت خالص
export {
  applyGuess,
  canAcceptGuess,
  createInitialState,
  EngineError,
  markHintUsed,
} from './state-machine';

// دشواری پویا مبتنی بر Flow
export {
  clampDifficulty,
  getDifficultyProfile,
  suggestNextDifficulty,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  type DifficultyProfile,
  type PracticeHistoryItem,
} from './difficulty';

// «روز دُردانه» — پاداش متغیر قطعی (~۱/۷)
export { isDordanehDay } from './dordaneh-day';

// راهنمای مبتنی بر آنتروپی
export { computeBestHint, type HintResult } from './hint';

// PRNG قطعی (برای مصرف‌کنندگان پایین‌دستی که seed دارند)
export { mulberry32, hashInt, combineSeeds } from './rng';
