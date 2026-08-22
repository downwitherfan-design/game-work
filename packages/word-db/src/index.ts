// @dordaneh/word-db — مالک: AI-02. پیاده‌سازی طبق docs/02_CONTRACTS.md §2.
export { wordDb, difficultyToTier } from './api';
export { mulberry32, seededIndex } from './rng';
export {
  answers6,
  practiceWords,
  validWords,
  blocklist,
  answersMeta,
  validWordSet,
  practiceByTier,
} from './data';
export type { PracticeEntry } from './data';
