/**
 * کنترلر تعامل صفحه‌ی بازی — منطق خالص، بدون DOM (تست‌پذیری کامل).
 * UI فقط store این کنترلر را رندر می‌کند و اکشن‌ها را صدا می‌زند.
 *
 * جریان: تایپ → ثبت → (نامعتبر: shake بدون جریمه | معتبر: reveal پلکانی)
 * → پایان: انتشار puzzle_finished روی EventBus + مودال نتیجه.
 */

import type { AudioApi, EngineApi, EventBus, GuessEvaluation, PuzzleState } from '@dordaneh/contracts';
import { normalizeFa } from '@dordaneh/contracts';
import { revealMomentMs, revealTotalMs, TIMINGS } from './timings';

export type GameMode = 'daily' | 'practice' | 'duel';

export type BoardPhase =
  | 'typing' // ورودی آزاد
  | 'revealing' // انیمیشن flip در جریان — ورودی قفل
  | 'won'
  | 'lost';

export interface ToastMsg {
  id: number;
  kind: 'error' | 'info';
  text: string;
}

export interface HintInfo {
  letter: string;
  position: number;
}

export interface BoardViewState {
  phase: BoardPhase;
  puzzleId: string;
  wordLength: number;
  maxGuesses: number;
  /** حدس‌های نهایی‌شده (ارزیابی‌شده) */
  guesses: GuessEvaluation[];
  /** حدس در حال تایپ */
  current: string;
  /** ایندکس آخرین کاشیِ pop شده (برای انیمیشن تایپ) */
  lastTypedIndex: number;
  /** ردیفی که الان انیمیشن shake دارد (یا null) */
  shakeRow: number | null;
  /** ردیفی که الان reveal پلکانی دارد (یا null) */
  revealingRow: number | null;
  /** چند کاشی از ردیف revealingRow رنگ گرفته‌اند (0..wordLength) */
  revealedTiles: number;
  /** مودال نتیجه باز است؟ */
  resultOpen: boolean;
  toast: ToastMsg | null;
  hint: HintInfo | null;
  hintLoading: boolean;
  hintsUsed: number;
  solution: string | null;
}

export interface ControllerDeps {
  engine: EngineApi;
  audio: AudioApi;
  bus: EventBus;
  mode: GameMode;
  puzzleId: string;
  wordLength: number;
  maxGuesses?: number;
  /** زمان‌بند تزریق‌پذیر برای تست (پیش‌فرض setTimeout) */
  schedule?: (fn: () => void, ms: number) => void;
  /** بدون انیمیشن (prefers-reduced-motion): revealها فوری */
  reducedMotion?: boolean;
  now?: () => number;
  /** سهمیه‌ی راهنمای رایگان (پیش‌فرض ۱) */
  freeHintQuota?: number;
}

export interface BoardController {
  getState(): BoardViewState;
  subscribe(cb: () => void): () => void;
  typeLetter(letter: string): void;
  backspace(): void;
  submit(): void;
  requestHint(): void;
  /** پس از reward_ad_completed توسط UI صدا زده می‌شود */
  grantExtraHint(): void;
  openResult(): void;
  closeResult(): void;
  dismissToast(): void;
}

let toastSeq = 0;

export function createBoardController(deps: ControllerDeps): BoardController {
  const {
    engine,
    audio,
    bus,
    mode,
    puzzleId,
    wordLength,
    maxGuesses = 6,
    schedule = (fn, ms) => setTimeout(fn, ms),
    reducedMotion = false,
    now = () => Date.now(),
    freeHintQuota = 1,
  } = deps;

  const startedAt = now();

  // بازیابی وضعیت قبلی از موتور (آفلاین-اول: refresh وسط بازی نباید پیشرفت را بسوزاند)
  let initial: PuzzleState | null = null;
  try {
    initial = engine.getState(puzzleId);
  } catch {
    initial = null;
  }

  const state: BoardViewState = {
    phase:
      initial?.status === 'won' ? 'won' : initial?.status === 'lost' ? 'lost' : 'typing',
    puzzleId,
    wordLength,
    maxGuesses,
    guesses: initial ? [...initial.guesses] : [],
    current: '',
    lastTypedIndex: -1,
    shakeRow: null,
    revealingRow: null,
    revealedTiles: 0,
    resultOpen: initial?.status === 'won' || initial?.status === 'lost',
    toast: null,
    hint: null,
    hintLoading: false,
    hintsUsed: initial?.hintsUsed ?? 0,
    solution: initial?.solution ?? null,
  };

  const listeners = new Set<() => void>();
  function notify(): void {
    for (const cb of [...listeners]) cb();
  }

  function showToast(kind: ToastMsg['kind'], text: string): void {
    state.toast = { id: ++toastSeq, kind, text };
    notify();
    const myId = state.toast.id;
    schedule(() => {
      if (state.toast?.id === myId) {
        state.toast = null;
        notify();
      }
    }, TIMINGS.toastMs);
  }

  // انتشار شروع بازی (فقط بازی تازه)
  if (state.phase === 'typing' && state.guesses.length === 0) {
    bus.emit({ type: 'puzzle_started', puzzleId, mode });
  }

  function finish(won: boolean): void {
    state.phase = won ? 'won' : 'lost';
    try {
      const s = engine.getState(puzzleId);
      state.solution = s.solution ?? state.solution;
    } catch {
      /* fail-soft */
    }
    audio.play(won ? 'win' : 'lose');
    audio.haptic(won ? 'success' : 'medium');
    bus.emit({
      type: 'puzzle_finished',
      puzzleId,
      won,
      guessCount: state.guesses.length,
      durationMs: Math.max(0, now() - startedAt),
    });
    // مودال نتیجه پس از پایان انیمیشن (قله-پایان: بگذار موج برد دیده شود)
    const delay = reducedMotion ? 0 : TIMINGS.resultModalDelayMs;
    schedule(() => {
      state.resultOpen = true;
      notify();
    }, delay);
    notify();
  }

  function startReveal(evaluation: GuessEvaluation): void {
    const row = state.guesses.length;
    state.guesses = [...state.guesses, evaluation];
    state.current = '';
    state.lastTypedIndex = -1;
    bus.emit({ type: 'guess_submitted', puzzleId, guessIndex: row });

    const isWin = evaluation.states.every((s) => s === 'correct');
    const isLoss = !isWin && state.guesses.length >= maxGuesses;

    if (reducedMotion) {
      // بدون انیمیشن: رنگ‌ها فوری، فقط صدای جمع‌بندی
      state.revealingRow = null;
      state.revealedTiles = wordLength;
      if (isWin || isLoss) finish(isWin);
      else {
        state.phase = 'typing';
        notify();
      }
      return;
    }

    state.phase = 'revealing';
    state.revealingRow = row;
    state.revealedTiles = 0;
    notify();

    // پلکانی: در لحظه‌ی نیمه‌ی چرخش هر کاشی، رنگ + صدای وضعیت (تعلیق دوپامینی)
    const chars = [...evaluation.guess];
    for (let i = 0; i < chars.length; i++) {
      const st = evaluation.states[i];
      schedule(() => {
        state.revealedTiles = i + 1;
        audio.play('flip');
        if (st === 'correct' || st === 'present' || st === 'absent') audio.play(st);
        notify();
      }, revealMomentMs(i));
    }

    schedule(() => {
      state.revealingRow = null;
      if (isWin || isLoss) finish(isWin);
      else {
        state.phase = 'typing';
        notify();
      }
    }, revealTotalMs(wordLength));
  }

  return {
    getState: () => state,

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    typeLetter(letter) {
      if (state.phase !== 'typing') return;
      if ([...state.current].length >= wordLength) return;
      state.current += letter;
      state.lastTypedIndex = [...state.current].length - 1;
      audio.play('tap');
      audio.haptic('light');
      notify();
    },

    backspace() {
      if (state.phase !== 'typing') return;
      const chars = [...state.current];
      if (chars.length === 0) return;
      state.current = chars.slice(0, -1).join('');
      state.lastTypedIndex = -1;
      audio.haptic('light');
      notify();
    },

    submit() {
      if (state.phase !== 'typing') return;
      const guess = normalizeFa(state.current);
      const row = state.guesses.length;

      const shake = (): void => {
        state.shakeRow = row;
        audio.haptic('error');
        notify();
        schedule(() => {
          state.shakeRow = null;
          notify();
        }, TIMINGS.shakeMs);
      };

      if ([...guess].length !== wordLength) {
        shake();
        showToast('error', `WRONG_LENGTH:${wordLength}`);
        return;
      }

      let result: ReturnType<EngineApi['evaluateGuess']>;
      try {
        result = engine.evaluateGuess(puzzleId, guess);
      } catch {
        result = { error: 'INVALID_WORD' };
      }

      if ('error' in result) {
        shake();
        showToast(
          'error',
          result.error === 'WRONG_LENGTH' ? `WRONG_LENGTH:${wordLength}` : 'INVALID_WORD',
        );
        return;
      }

      startReveal(result);
    },

    requestHint() {
      if (state.phase !== 'typing') return;
      if (state.hintsUsed >= freeHintQuota) {
        // سهمیه تمام — تبلیغ جایزه‌ای (پیاده‌سازی مال AI-11؛ ما فقط رویداد)
        state.hintLoading = true;
        bus.emit({ type: 'reward_ad_requested', placement: 'hint' });
        notify();
        return;
      }
      const h = engine.getHint(puzzleId);
      state.hintsUsed += 1;
      if (h) {
        state.hint = { letter: h.letter, position: h.position };
        audio.play('correct');
        audio.haptic('success');
      } else {
        showToast('info', 'HINT_UNAVAILABLE');
      }
      notify();
    },

    grantExtraHint() {
      state.hintLoading = false;
      const h = engine.getHint(puzzleId);
      state.hintsUsed += 1;
      if (h) {
        state.hint = { letter: h.letter, position: h.position };
        audio.play('correct');
        audio.haptic('success');
      } else {
        showToast('info', 'HINT_UNAVAILABLE');
      }
      notify();
    },

    openResult() {
      state.resultOpen = true;
      notify();
    },

    closeResult() {
      state.resultOpen = false;
      notify();
    },

    dismissToast() {
      state.toast = null;
      notify();
    },
  };
}
