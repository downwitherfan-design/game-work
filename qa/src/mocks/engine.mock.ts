/**
 * @dordaneh/qa — mock مرجع EngineApi (تا آماده‌شدن @dordaneh/core-engine واقعی از AI-01).
 * فقط برای اجرای suite قرارداد روی «چیزی» — پیاده‌سازی واقعی مال AI-01 است.
 * قطعی، pure و بدون DOM/شبکه (خط قرمز ۲۰). WordDbApi تزریق می‌شود (جداسازی موتور/محتوا).
 */

import {
  normalizeFa,
  type EngineApi,
  type GuessEvaluation,
  type PersianChar,
  type PuzzleState,
  type WordDbApi,
} from '@dordaneh/contracts';
import { evaluateOracle, toChars } from '../oracle';

interface InternalPuzzle {
  state: PuzzleState;
  solution: string;
}

export interface MockEngineOptions {
  /** ساعت تزریق‌پذیر برای تست‌پذیری (epoch ms) */
  now?: () => number;
  /** آیا اعتبار واژه‌ها بررسی شود؟ (تست تعویض دیتابیس ممکن است خاموشش کند) */
  validateWords?: boolean;
}

export function createMockEngine(wordDb: WordDbApi, options: MockEngineOptions = {}): EngineApi {
  const now = options.now ?? (() => Date.now());
  const validateWords = options.validateWords ?? true;
  const puzzles = new Map<string, InternalPuzzle>();

  function openPuzzle(puzzleId: string, solution: string): { puzzleId: string; wordLength: number } {
    const normalized = normalizeFa(solution);
    const wordLength = toChars(normalized).length;
    if (!puzzles.has(puzzleId)) {
      puzzles.set(puzzleId, {
        solution: normalized,
        state: {
          puzzleId,
          wordLength,
          maxGuesses: 6,
          guesses: [],
          status: 'playing',
          hintsUsed: 0,
          startedAt: now(),
        },
      });
    }
    return { puzzleId, wordLength };
  }

  function requirePuzzle(puzzleId: string): InternalPuzzle {
    const p = puzzles.get(puzzleId);
    if (!p) throw new Error(`unknown puzzleId: ${puzzleId}`);
    return p;
  }

  return {
    getDailyPuzzle(puzzleNumber: number): { puzzleId: string; wordLength: number } {
      const solution = wordDb.getAnswer(puzzleNumber, 6);
      return openPuzzle(`daily-${puzzleNumber}`, solution);
    },
    getPracticePuzzle(difficulty: number, seed = 1): { puzzleId: string; wordLength: number } {
      const { word } = wordDb.getPracticeAnswer(seed, difficulty);
      return openPuzzle(`practice-${seed}-${difficulty}`, word);
    },
    getOnboardingPuzzle(): { puzzleId: string; wordLength: number } {
      // پیروزی ۳۰ثانیه‌ای: معمای آسانِ دست‌چین و ثابت
      return openPuzzle('onboarding-1', wordDb.getAnswer(0, 6));
    },
    evaluateGuess(
      puzzleId: string,
      guess: string,
    ): GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' } {
      const p = requirePuzzle(puzzleId);
      const normalized = normalizeFa(guess);
      const chars = toChars(normalized);
      if (chars.length !== p.state.wordLength) return { error: 'WRONG_LENGTH' };
      if (validateWords && !wordDb.isValidWord(normalized)) return { error: 'INVALID_WORD' };
      if (p.state.status !== 'playing') {
        // بازیِ تمام‌شده حدس نمی‌پذیرد — آخرین ارزیابی را برنمی‌گردانیم؛ خطای طول نه، پس:
        return { error: 'INVALID_WORD' };
      }
      const evaluation: GuessEvaluation = {
        guess: normalized,
        states: evaluateOracle(p.solution, normalized),
      };
      p.state.guesses.push(evaluation);
      const won = evaluation.states.every((s) => s === 'correct');
      if (won) {
        p.state.status = 'won';
        p.state.solution = p.solution;
        p.state.finishedAt = now();
      } else if (p.state.guesses.length >= p.state.maxGuesses) {
        p.state.status = 'lost';
        p.state.solution = p.solution;
        p.state.finishedAt = now();
      }
      return evaluation;
    },
    getState(puzzleId: string): PuzzleState {
      const p = requirePuzzle(puzzleId);
      // کپی دفاعی — state داخلی نشت نمی‌کند
      return JSON.parse(JSON.stringify(p.state)) as PuzzleState;
    },
    getHint(puzzleId: string): { letter: PersianChar; position: number } | null {
      const p = requirePuzzle(puzzleId);
      if (p.state.status !== 'playing') return null;
      const solChars = toChars(p.solution);
      // اولین موقعیتی که هنوز سبز نشده
      const greens = new Set<number>();
      for (const g of p.state.guesses) {
        g.states.forEach((s, i) => {
          if (s === 'correct') greens.add(i);
        });
      }
      for (let i = 0; i < solChars.length; i++) {
        if (!greens.has(i)) {
          p.state.hintsUsed += 1;
          return { letter: solChars[i] as string, position: i };
        }
      }
      return null;
    },
  };
}
