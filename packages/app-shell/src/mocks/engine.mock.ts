/**
 * Mock قراردادیِ EngineApi (مالک واقعی: AI-01 در @dordaneh/core-engine).
 * فقط تا آماده‌شدن پکیج واقعی استفاده می‌شود — سوییچ خودکار در services/registry.
 * منطق ارزیابی مطابق قواعد Wordle (مدیریت حروف تکراری) و نرمال‌سازی فقط از contracts.
 */
import {
  normalizeFa,
  type EngineApi,
  type GuessEvaluation,
  type LetterState,
  type PuzzleState,
} from '@dordaneh/contracts';

/** واژه‌های امن و پرکاربرد فارسی معیار — داده‌ی mock، نه متن UI */
const MOCK_ANSWERS_6 = [
  'دردانه',
  'کتابچه',
  'گلستان',
  'مهربان',
  'ارغوان',
  'باغبان',
].map(normalizeFa).filter((w) => w.length === 6);

const MOCK_PRACTICE: Record<number, string[]> = {
  4: ['کتاب', 'باران', 'ستاره', 'دوست'].map(normalizeFa).filter((w) => w.length === 4),
  5: ['پنجره', 'دفترچه', 'آسمان', 'لبخند'].map(normalizeFa).filter((w) => w.length === 5),
  6: MOCK_ANSWERS_6,
  7: ['فرهنگ‌سرا', 'کتابخانه', 'مهمانی'].map(normalizeFa).filter((w) => w.length === 7),
};

/** جواب آسان دست‌چین آنبوردینگ — «پیروزی ۳۰ ثانیه‌ای» */
const ONBOARDING_WORD = normalizeFa('دردانه'); // ۶ حرف، آشنا، خودِ نام بازی

export function evaluate(solution: string, guess: string): LetterState[] {
  const s = solution.split('');
  const g = guess.split('');
  const states: LetterState[] = new Array<LetterState>(g.length).fill('absent');
  const remaining = new Map<string, number>();
  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) {
      states[i] = 'correct';
    } else {
      const ch = s[i] as string;
      remaining.set(ch, (remaining.get(ch) ?? 0) + 1);
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (states[i] === 'correct') continue;
    const ch = g[i] as string;
    const left = remaining.get(ch) ?? 0;
    if (left > 0) {
      states[i] = 'present';
      remaining.set(ch, left - 1);
    }
  }
  return states;
}

interface InternalPuzzle {
  state: PuzzleState;
  solution: string;
}

export function createMockEngine(now: () => number = () => Date.now()): EngineApi {
  const puzzles = new Map<string, InternalPuzzle>();

  function ensure(puzzleId: string, solution: string): InternalPuzzle {
    let p = puzzles.get(puzzleId);
    if (!p) {
      p = {
        solution,
        state: {
          puzzleId,
          wordLength: solution.length,
          maxGuesses: 6,
          guesses: [],
          status: 'playing',
          hintsUsed: 0,
          startedAt: now(),
        },
      };
      puzzles.set(puzzleId, p);
    }
    return p;
  }

  function solutionFor(puzzleId: string): string {
    if (puzzleId === 'onboarding-1') return ONBOARDING_WORD;
    const daily = /^daily-(\d+)$/.exec(puzzleId);
    if (daily) {
      const n = Number(daily[1]);
      return MOCK_ANSWERS_6[((n % MOCK_ANSWERS_6.length) + MOCK_ANSWERS_6.length) % MOCK_ANSWERS_6.length] as string;
    }
    const practice = /^practice-(\d+)-(\d+)$/.exec(puzzleId);
    if (practice) {
      const difficulty = Math.min(5, Math.max(1, Number(practice[1])));
      const seed = Number(practice[2]);
      const len = difficulty <= 2 ? 4 : difficulty === 3 ? 5 : 6;
      const list = MOCK_PRACTICE[len] ?? MOCK_ANSWERS_6;
      return list[seed % list.length] as string;
    }
    return MOCK_ANSWERS_6[0] as string;
  }

  return {
    getDailyPuzzle(puzzleNumber: number) {
      const puzzleId = `daily-${puzzleNumber}`;
      const p = ensure(puzzleId, solutionFor(puzzleId));
      return { puzzleId, wordLength: p.state.wordLength };
    },
    getPracticePuzzle(difficulty: number, seed?: number) {
      const s = seed ?? Math.floor(Math.random() * 1_000_000);
      const puzzleId = `practice-${Math.min(5, Math.max(1, difficulty))}-${s}`;
      const p = ensure(puzzleId, solutionFor(puzzleId));
      return { puzzleId, wordLength: p.state.wordLength };
    },
    getOnboardingPuzzle() {
      const puzzleId = 'onboarding-1';
      const p = ensure(puzzleId, ONBOARDING_WORD);
      return { puzzleId, wordLength: p.state.wordLength };
    },
    evaluateGuess(puzzleId: string, guess: string): GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' } {
      const p = ensure(puzzleId, solutionFor(puzzleId));
      const normalized = normalizeFa(guess);
      if (normalized.length !== p.state.wordLength) return { error: 'WRONG_LENGTH' };
      // mock سهل‌گیر است: هر رشته‌ی فارسی هم‌طول را واژه‌ی معتبر می‌شمارد
      // (اعتبارسنجی واقعی مال @dordaneh/word-db است)
      if (!/^[\u0600-\u06FF]+$/.test(normalized)) return { error: 'INVALID_WORD' };
      if (p.state.status !== 'playing') {
        return { guess: normalized, states: evaluate(p.solution, normalized) };
      }
      const states = evaluate(p.solution, normalized);
      const evaluation: GuessEvaluation = { guess: normalized, states };
      p.state.guesses.push(evaluation);
      const won = states.every((st) => st === 'correct');
      if (won) {
        p.state.status = 'won';
        p.state.finishedAt = now();
        p.state.solution = p.solution;
      } else if (p.state.guesses.length >= p.state.maxGuesses) {
        p.state.status = 'lost';
        p.state.finishedAt = now();
        p.state.solution = p.solution;
      }
      return evaluation;
    },
    getState(puzzleId: string): PuzzleState {
      const p = ensure(puzzleId, solutionFor(puzzleId));
      return { ...p.state, guesses: [...p.state.guesses] };
    },
    getHint(puzzleId: string) {
      const p = ensure(puzzleId, solutionFor(puzzleId));
      if (p.state.status !== 'playing') return null;
      // اولین جایگاهی که هنوز correct نشده را لو بده
      const solved = new Set<number>();
      for (const g of p.state.guesses) {
        g.states.forEach((st, i) => {
          if (st === 'correct') solved.add(i);
        });
      }
      for (let i = 0; i < p.solution.length; i++) {
        if (!solved.has(i)) {
          p.state.hintsUsed += 1;
          return { letter: p.solution[i] as string, position: i };
        }
      }
      return null;
    },
  };
}
