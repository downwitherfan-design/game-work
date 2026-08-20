/**
 * ماشین حالت معما — انتقال‌های خالص و قطعی روی PuzzleState قرارداد.
 *
 *   playing --(حدس برنده)--> won
 *   playing --(حدس ششم ناموفق)--> lost
 *   won / lost --(هر حدسی)--> ⛔ (EngineError: GAME_OVER)
 *
 * `solution` طبق قرارداد فقط پس از پایان بازی در state قرار می‌گیرد.
 * همه‌ی توابع، state جدید برمی‌گردانند (immutable) — بدون side effect.
 */
import type { GuessEvaluation, PuzzleState } from '@dordaneh/contracts';
import { isWinningEvaluation } from './evaluate-guess';

/**
 * خطای داخلی موتور برای نقض پروتکل (حدس پس از پایان، معمای ناشناخته).
 * قرارداد فعلی فقط INVALID_WORD/WRONG_LENGTH را به‌صورت مقدار برمی‌گرداند؛
 * برای این دو حالت (باگ فراخواننده) RFC-0001 ثبت شده و تا تأیید، throw می‌کنیم.
 */
export class EngineError extends Error {
  public readonly code: 'GAME_OVER' | 'UNKNOWN_PUZZLE';
  constructor(code: 'GAME_OVER' | 'UNKNOWN_PUZZLE', message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

export function createInitialState(
  puzzleId: string,
  wordLength: number,
  maxGuesses: number,
  startedAt: number,
): PuzzleState {
  return {
    puzzleId,
    wordLength,
    maxGuesses,
    guesses: [],
    status: 'playing',
    hintsUsed: 0,
    startedAt,
  };
}

/** آیا در این حالت، پذیرش حدس جدید مجاز است؟ */
export function canAcceptGuess(state: PuzzleState): boolean {
  return state.status === 'playing' && state.guesses.length < state.maxGuesses;
}

/**
 * اعمال یک حدس ارزیابی‌شده و گذار حالت.
 * @throws EngineError('GAME_OVER') اگر بازی تمام شده باشد.
 */
export function applyGuess(
  state: PuzzleState,
  evaluation: GuessEvaluation,
  solution: string,
  now: number,
): PuzzleState {
  if (!canAcceptGuess(state)) {
    throw new EngineError(
      'GAME_OVER',
      `معمای «${state.puzzleId}» تمام شده است (${state.status}) — حدس جدید پذیرفته نمی‌شود`,
    );
  }

  const guesses = [...state.guesses, evaluation];
  const won = isWinningEvaluation(evaluation);
  const lost = !won && guesses.length >= state.maxGuesses;

  if (won || lost) {
    return {
      ...state,
      guesses,
      status: won ? 'won' : 'lost',
      solution, // فقط پس از پایان بازی پر می‌شود (قرارداد §1)
      finishedAt: now,
    };
  }

  return { ...state, guesses };
}

/** ثبت مصرف یک راهنما */
export function markHintUsed(state: PuzzleState): PuzzleState {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}
