/**
 * Mock قراردادی EngineApi — تا آماده‌شدن @dordaneh/core-engine (AI-01).
 * دقیقاً همان قرارداد §1 را پیاده می‌کند: deterministic، آفلاین، ارزیابی
 * دوپاسه‌ی صحیح حروف تکراری (الگوریتم استاندارد Wordle).
 * ⚠️ فقط برای dev/demo/test — app-shell موتور واقعی را تزریق می‌کند.
 */

import type { EngineApi, GuessEvaluation, LetterState, PersianChar, PuzzleState } from '@dordaneh/contracts';
import { normalizeFa } from '@dordaneh/contracts';

/** کلمات ۶حرفی نمونه (نرمال‌شده) — جواب‌های mock */
const ANSWERS_6: readonly string[] = [
  'دردانه', // ۶ نویسه پس از نرمال‌سازی: د ر د ا ن ه
  'ایرانی',
  'خورشید',
  'مهربان',
  'گلستان',
  'پرستار',
].map(normalizeFa);

/** واژه‌نامه‌ی معتبر کوچک برای دمو (شامل جواب‌ها) */
const VALID_WORDS: ReadonlySet<string> = new Set(
  [
    ...ANSWERS_6,
    'دستکش', 'زندگی', 'باران۰', 'کتابها', 'مدرسه۰', 'ستاره۰', // padding نمونه
    'سرزمین', 'آبادان', 'تهرانی', 'شیرینی', 'روزانه', 'دوستان',
    'استکان', 'بستنی۰', 'پنجره۰', 'دلتنگی', 'سرافراز', 'مهمانی',
  ].map(normalizeFa),
);

/** ارزیابی دوپاسه‌ی استاندارد (حروف تکراری را درست هندل می‌کند) */
export function evaluate(solution: string, guess: string): LetterState[] {
  const sol = [...solution];
  const g = [...guess];
  const states: LetterState[] = new Array<LetterState>(g.length).fill('absent');
  const remaining = new Map<string, number>();

  for (let i = 0; i < g.length; i++) {
    if (g[i] === sol[i]) states[i] = 'correct';
    else {
      const ch = sol[i];
      if (ch !== undefined) remaining.set(ch, (remaining.get(ch) ?? 0) + 1);
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (states[i] === 'correct') continue;
    const ch = g[i];
    if (ch === undefined) continue;
    const left = remaining.get(ch) ?? 0;
    if (left > 0) {
      states[i] = 'present';
      remaining.set(ch, left - 1);
    }
  }
  return states;
}

interface MockPuzzle {
  state: PuzzleState;
  solution: string;
}

/** xorshift ساده برای انتخاب قطعی کلمه از seed */
function pick(list: readonly string[], seed: number): string {
  let x = (seed || 1) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5; x >>>= 0;
  return list[x % list.length] as string;
}

export function createMockEngine(): EngineApi {
  const puzzles = new Map<string, MockPuzzle>();

  function ensure(puzzleId: string, solution: string, wordLength: number): MockPuzzle {
    let p = puzzles.get(puzzleId);
    if (!p) {
      p = {
        solution,
        state: {
          puzzleId,
          wordLength,
          maxGuesses: 6,
          guesses: [],
          status: 'playing',
          hintsUsed: 0,
          startedAt: Date.now(),
        },
      };
      puzzles.set(puzzleId, p);
    }
    return p;
  }

  return {
    getDailyPuzzle(puzzleNumber: number) {
      const id = `daily-${puzzleNumber}`;
      const solution = ANSWERS_6[((puzzleNumber % ANSWERS_6.length) + ANSWERS_6.length) % ANSWERS_6.length] as string;
      ensure(id, solution, 6);
      return { puzzleId: id, wordLength: 6 };
    },

    getPracticePuzzle(difficulty: number, seed?: number) {
      const s = seed ?? Math.floor(Math.random() * 1e9);
      const id = `practice-${s}`;
      // در mock همه ۶حرفی‌اند؛ دشواری فقط در انتخاب کلمه مؤثر است
      const solution = pick(ANSWERS_6, s + difficulty);
      ensure(id, solution, 6);
      return { puzzleId: id, wordLength: 6 };
    },

    getOnboardingPuzzle() {
      const id = 'onboarding-1';
      ensure(id, normalizeFa('دردانه'), 6);
      return { puzzleId: id, wordLength: 6 };
    },

    evaluateGuess(puzzleId: string, guess: string): GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' } {
      const p = puzzles.get(puzzleId);
      if (!p || p.state.status !== 'playing') return { error: 'INVALID_WORD' };
      const g = normalizeFa(guess);
      if ([...g].length !== p.state.wordLength) return { error: 'WRONG_LENGTH' };
      if (!VALID_WORDS.has(g)) return { error: 'INVALID_WORD' };

      const states = evaluate(p.solution, g);
      const ev: GuessEvaluation = { guess: g, states };
      p.state.guesses.push(ev);

      const won = states.every((s) => s === 'correct');
      if (won) p.state.status = 'won';
      else if (p.state.guesses.length >= p.state.maxGuesses) p.state.status = 'lost';
      if (p.state.status !== 'playing') {
        p.state.finishedAt = Date.now();
        p.state.solution = p.solution;
      }
      return ev;
    },

    getState(puzzleId: string): PuzzleState {
      const p = puzzles.get(puzzleId);
      if (!p) {
        return {
          puzzleId,
          wordLength: 6,
          maxGuesses: 6,
          guesses: [],
          status: 'playing',
          hintsUsed: 0,
          startedAt: Date.now(),
        };
      }
      return { ...p.state, guesses: [...p.state.guesses] };
    },

    getHint(puzzleId: string): { letter: PersianChar; position: number } | null {
      const p = puzzles.get(puzzleId);
      if (!p || p.state.status !== 'playing') return null;
      // اولین جایگاهی که هنوز correct نشده را لو بده
      const solved = new Set<number>();
      for (const g of p.state.guesses) {
        g.states.forEach((s, i) => {
          if (s === 'correct') solved.add(i);
        });
      }
      const chars = [...p.solution];
      for (let i = 0; i < chars.length; i++) {
        if (!solved.has(i)) {
          p.state.hintsUsed += 1;
          return { letter: chars[i] as string, position: i };
        }
      }
      return null;
    },
  };
}
