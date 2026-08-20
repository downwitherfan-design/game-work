/**
 * موتور اصلی بازی دُردانه — پیاده‌سازی کامل EngineApi قرارداد (docs/02_CONTRACTS.md §1).
 *
 * اصول:
 *  - خالص و قطعی: بدون DOM، بدون شبکه، بدون Math.random/Date پنهان.
 *    تنها منابع غیرقطعی (زمان) از بیرون تزریق می‌شوند (پیش‌فرض: Date.now فقط
 *    برای مُهر زمانی startedAt/finishedAt — هرگز در منطق بازی).
 *  - وابستگی وارونه (DI): word-db از طریق اینترفیس WordDbApi قرارداد تزریق
 *    می‌شود؛ کد تولیدی هیچ mock داخلی ندارد.
 *  - آفلاین-اول: جواب روزانه به‌صورت قطعی از word-db.getAnswer می‌آید
 *    (خط قرمز #18).
 */
import {
  normalizeFa,
  type EngineApi,
  type GuessEvaluation,
  type PersianChar,
  type PuzzleState,
  type WordDbApi,
} from '@dordaneh/contracts';
import { evaluateGuessAgainst } from './evaluate-guess';
import {
  applyGuess,
  canAcceptGuess,
  createInitialState,
  EngineError,
  markHintUsed,
} from './state-machine';
import { clampDifficulty } from './difficulty';
import { computeBestHint } from './hint';
import { combineSeeds } from './rng';

export const DAILY_WORD_LENGTH = 6;
export const MAX_GUESSES = 6;

/** شناسه‌ی معمای آنبوردینگ (پیروزی ۳۰ ثانیه‌ای — Bandura 1977) */
export const ONBOARDING_PUZZLE_ID = 'onboarding-1';

/** گزینه‌های ساخت موتور */
export interface EngineOptions {
  /** دیتابیس کلمات (قرارداد §2) — در تست‌ها mock تزریق می‌شود */
  wordDb: WordDbApi;
  /** ساعت تزریقی برای مُهرهای زمانی (پیش‌فرض Date.now — در منطق بازی استفاده نمی‌شود) */
  now?: () => number;
}

interface PuzzleRecord {
  state: PuzzleState;
  solution: string;
}

/**
 * کارخانه‌ی موتور — یک نمونه‌ی EngineApi با استیت درون-حافظه‌ای معماهای فعال.
 * (پایداری بین جلسات بر عهده‌ی app-shell/StorageApi است، نه موتور خالص.)
 */
export function createEngine(options: EngineOptions): EngineApi {
  const { wordDb } = options;
  const now = options.now ?? ((): number => Date.now());

  /** معماهای فعال این نشست */
  const puzzles = new Map<string, PuzzleRecord>();

  function register(puzzleId: string, solution: string, wordLength: number): void {
    if (!puzzles.has(puzzleId)) {
      puzzles.set(puzzleId, {
        state: createInitialState(puzzleId, wordLength, MAX_GUESSES, now()),
        solution,
      });
    }
  }

  function mustGet(puzzleId: string): PuzzleRecord {
    const rec = puzzles.get(puzzleId);
    if (!rec) {
      throw new EngineError('UNKNOWN_PUZZLE', `معمای «${puzzleId}» شناخته‌شده نیست`);
    }
    return rec;
  }

  const engine: EngineApi = {
    getDailyPuzzle(puzzleNumber: number): { puzzleId: string; wordLength: number } {
      const puzzleId = `daily-${puzzleNumber}`;
      const solution = normalizeFa(wordDb.getAnswer(puzzleNumber, DAILY_WORD_LENGTH));
      register(puzzleId, solution, Array.from(solution).length);
      return { puzzleId, wordLength: Array.from(solution).length };
    },

    getPracticePuzzle(difficulty: number, seed = 1): { puzzleId: string; wordLength: number } {
      const d = clampDifficulty(difficulty);
      // ترکیب seed و دشواری → seed قطعی یکتا برای word-db
      const effectiveSeed = combineSeeds(seed, d);
      const { word } = wordDb.getPracticeAnswer(effectiveSeed, d);
      const solution = normalizeFa(word);
      const puzzleId = `practice-${effectiveSeed}`;
      register(puzzleId, solution, Array.from(solution).length);
      return { puzzleId, wordLength: Array.from(solution).length };
    },

    getOnboardingPuzzle(): { puzzleId: string; wordLength: number } {
      // معمای دست‌چینِ آسان: کلمه‌ی بسیار پرکاربرد (دشواری ۱، seed ثابت ۰)
      // seed ثابت → همه‌ی کاربران جدید همان معمای آسانِ تأییدشده را می‌بینند.
      const { word } = wordDb.getPracticeAnswer(0, 1);
      const solution = normalizeFa(word);
      register(ONBOARDING_PUZZLE_ID, solution, Array.from(solution).length);
      return { puzzleId: ONBOARDING_PUZZLE_ID, wordLength: Array.from(solution).length };
    },

    evaluateGuess(
      puzzleId: string,
      guess: string,
    ): GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' } {
      const rec = mustGet(puzzleId);

      if (!canAcceptGuess(rec.state)) {
        throw new EngineError(
          'GAME_OVER',
          `معمای «${puzzleId}» تمام شده است — حدس جدید پذیرفته نمی‌شود`,
        );
      }

      // نرمال‌سازی با تابع رسمی قرارداد (خط قرمز #21)
      const normalized = normalizeFa(guess);

      if (Array.from(normalized).length !== rec.state.wordLength) {
        return { error: 'WRONG_LENGTH' };
      }
      if (!wordDb.isValidWord(normalized)) {
        return { error: 'INVALID_WORD' };
      }

      const evaluation = evaluateGuessAgainst(normalized, rec.solution);
      rec.state = applyGuess(rec.state, evaluation, rec.solution, now());
      return evaluation;
    },

    getState(puzzleId: string): PuzzleState {
      const rec = mustGet(puzzleId);
      // کپی دفاعی — استیت داخلی از بیرون قابل جهش نیست
      return {
        ...rec.state,
        guesses: rec.state.guesses.map((g) => ({ guess: g.guess, states: [...g.states] })),
      };
    },

    getHint(puzzleId: string): { letter: PersianChar; position: number } | null {
      const rec = mustGet(puzzleId);
      if (rec.state.status !== 'playing') return null;
      const hint = computeBestHint(rec.state, rec.solution);
      if (hint) rec.state = markHintUsed(rec.state);
      return hint;
    },
  };

  return engine;
}
