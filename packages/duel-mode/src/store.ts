/**
 * @dordaneh/duel-mode — ماشین حالت دوئل (framework-agnostic؛ UI فقط render می‌کند).
 * جریان ناهمزمان: ساخت → حل خودم → ارسال لینک → انتظار (poll ۳۰s) → نتیجه.
 * ضد اسپویل: اطلاعات حریف فقط پس از ثبت نتیجه‌ی خودم surface می‌شود.
 */

import type { DuelPlayer, EventBus, PuzzleState, StorageApi } from '@dordaneh/contracts';
import {
  DUEL_POLL_INTERVAL_MS,
  canRevealOpponent,
  decideVerdict,
  defaultPlayerName,
  generateAnonId,
  outcomeFromPuzzleState,
} from './logic';
import { DUEL_DNF, type DuelApi, type DuelOutcomeInput, type DuelViewState } from './types';
import { recordSeriesResult } from './series';

/** کلید ذخیره‌ی محلی duel-mode (خارج از کلیدهای رزروشده‌ی قرارداد §5) */
export const DUEL_STORAGE_KEYS = {
  anonId: 'dor.duel.anonId',
  playerName: 'dor.duel.name',
  series: 'dor.duel.series',
  /** پیشوند نتیجه‌ی محلی هر دوئل: dor.duel.result.<duelId> */
  resultPrefix: 'dor.duel.result.',
} as const;

export interface DuelStoreDeps {
  api: DuelApi;
  storage: StorageApi;
  /** EventBus سراسری قرارداد §5 — برای share_initiated و puzzle_started */
  bus?: EventBus;
  /** فلگ فیچر: پیش‌فرض خاموش تا فاز ۲ */
  featureEnabled?: boolean;
  /** ساعت تزریقی برای تست */
  now?: () => number;
  /** زمان‌بند تزریقی برای تست poller */
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}

export interface DuelStore {
  getState(): DuelViewState;
  subscribe(cb: (s: DuelViewState) => void): () => void;
  /** ورود به صفحه — path مثل '/duel' یا '/duel/abc' */
  enter(path: string): Promise<void>;
  /** ساخت دوئل جدید (کاربر A) */
  createDuel(): Promise<void>;
  /** مهمان B دعوت را قبول می‌کند → فاز حل */
  acceptInvite(): void;
  /** پایان بازی (از GameScreen به‌واسطه‌ی slot) → ثبت نتیجه */
  submitPuzzleResult(state: PuzzleState): Promise<void>;
  /** اعلان قصد اشتراک لینک دعوت (رویداد share_initiated با surface: 'duel') */
  markShareInitiated(): void;
  /** «انتقام»: دوئل جدید با همان حریف */
  rematch(): Promise<void>;
  /** تلاش دوباره پس از خطا */
  retry(): Promise<void>;
  /** خروج از صفحه — poller را متوقف می‌کند */
  dispose(): void;
}

const initialState = (enabled: boolean): DuelViewState => ({
  phase: enabled ? 'landing' : 'disabled',
  duelId: null,
  seed: null,
  inviteUrl: null,
  hostName: null,
  selfResult: null,
  opponent: null,
  verdict: null,
  errorKey: null,
});

export function createDuelStore(deps: DuelStoreDeps): DuelStore {
  const enabled = deps.featureEnabled ?? false;
  const setI = deps.setIntervalFn ?? setInterval;
  const clearI = deps.clearIntervalFn ?? clearInterval;

  let state = initialState(enabled);
  let lastPath = '/duel';
  const listeners = new Set<(s: DuelViewState) => void>();
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  function patch(p: Partial<DuelViewState>): void {
    state = { ...state, ...p };
    for (const cb of [...listeners]) cb(state);
  }

  function anonId(): string {
    let id = deps.storage.get<string>(DUEL_STORAGE_KEYS.anonId);
    if (!id) {
      id = generateAnonId();
      deps.storage.set(DUEL_STORAGE_KEYS.anonId, id);
    }
    return id;
  }

  function playerName(): string {
    let name = deps.storage.get<string>(DUEL_STORAGE_KEYS.playerName);
    if (!name) {
      name = defaultPlayerName();
      deps.storage.set(DUEL_STORAGE_KEYS.playerName, name);
    }
    return name;
  }

  function stopPolling(): void {
    if (pollHandle !== null) {
      clearI(pollHandle);
      pollHandle = null;
    }
  }

  function finishWith(opponent: DuelPlayer, self: DuelOutcomeInput): void {
    stopPolling();
    const oppOutcome: DuelOutcomeInput = {
      guessCount: opponent.guessCount ?? DUEL_DNF,
      durationMs: opponent.durationMs ?? 0,
    };
    const verdict = decideVerdict(self, oppOutcome);
    // ثبت در «سری دوئل» با این حریف (برد-باخت تجمعی)
    recordSeriesResult(deps.storage, DUEL_STORAGE_KEYS.series, opponent.name, verdict, deps.now?.() ?? Date.now());
    patch({ phase: 'finished', opponent, verdict });
  }

  async function pollOnce(): Promise<void> {
    const { duelId, selfResult } = state;
    if (!duelId || !canRevealOpponent(selfResult)) return; // دروازه‌ی ضد اسپویل
    const res = await deps.api.getDuel(duelId);
    if (!res.ok) {
      if (res.error === 'EXPIRED') {
        stopPolling();
        patch({ phase: 'expired' });
      }
      return; // خطای شبکه → poll بعدی (silent-degrade)
    }
    const data = res.data;
    if (data && data.status === 'finished' && selfResult) {
      const opponent = data.players.find((p) => p.name !== playerName()) ?? data.players[1];
      if (opponent) finishWith(opponent, selfResult);
    }
  }

  function startPolling(): void {
    stopPolling();
    pollHandle = setI(() => {
      void pollOnce();
    }, DUEL_POLL_INTERVAL_MS);
  }

  async function loadExisting(duelId: string): Promise<void> {
    patch({ phase: 'creating', duelId, errorKey: null });
    const res = await deps.api.getDuel(duelId);
    if (!res.ok) {
      if (res.error === 'EXPIRED') {
        patch({ phase: 'expired' });
      } else {
        patch({ phase: 'error', errorKey: 'duelMode.errorBody' });
      }
      return;
    }
    const data = res.data;
    const host = data?.players[0];
    // نتیجه‌ی محلی قبلی؟ (بازگشت به صفحه‌ی انتظار)
    const saved = deps.storage.get<DuelOutcomeInput>(`${DUEL_STORAGE_KEYS.resultPrefix}${duelId}`);
    if (saved) {
      patch({ phase: 'waiting', selfResult: saved, hostName: host?.name ?? null });
      startPolling();
      await pollOnce();
      return;
    }
    // مهمان تازه‌وارد: هیچ آماری از A نمایش داده نمی‌شود — فقط نامش
    patch({ phase: 'invited', hostName: host?.name ?? null, opponent: null });
  }

  return {
    getState: () => state,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async enter(path: string): Promise<void> {
      lastPath = path;
      if (!enabled) {
        patch({ phase: 'disabled' });
        return;
      }
      deps.bus?.emit({ type: 'screen_viewed', screen: 'duel' });
      const id = /^\/duel\/([A-Za-z0-9_-]+)\/?$/.exec(path)?.[1] ?? null;
      if (id) {
        await loadExisting(id);
        return;
      }
      // ضد race: اگر همین حالا دوئلی در جریان است (createDuel از enter جلو زده)،
      // بازگشت به landing وضعیت کاربر را نمی‌بلعد.
      if (state.duelId === null) patch(initialState(true));
    },

    async createDuel(): Promise<void> {
      patch({ phase: 'creating', errorKey: null });
      const res = await deps.api.createDuel(anonId(), playerName());
      if (!res.ok || !res.data) {
        patch({ phase: 'error', errorKey: 'duelMode.errorBody' });
        return;
      }
      const { duelId, inviteUrl, seed } = res.data;
      patch({ phase: 'solving', duelId, inviteUrl, seed });
      deps.bus?.emit({ type: 'puzzle_started', puzzleId: `duel-${duelId}`, mode: 'duel' });
    },

    acceptInvite(): void {
      const { duelId } = state;
      if (!duelId) return;
      // seed سمت مهمان از سرور نمی‌آید (قرارداد §7)؛ آداپتور RFC-0002:
      // seed قطعی از duelId مشتق می‌شود تا هر دو طرف همان معما را ببینند.
      patch({ phase: 'solving', seed: state.seed ?? seedFromDuelId(duelId) });
      deps.bus?.emit({ type: 'puzzle_started', puzzleId: `duel-${duelId}`, mode: 'duel' });
    },

    async submitPuzzleResult(puzzle: PuzzleState): Promise<void> {
      const { duelId } = state;
      if (!duelId) return;
      const outcome = outcomeFromPuzzleState(puzzle);
      deps.storage.set(`${DUEL_STORAGE_KEYS.resultPrefix}${duelId}`, outcome);
      patch({ selfResult: outcome });
      const res = await deps.api.submitResult(duelId, anonId(), outcome.guessCount, outcome.durationMs);
      if (res.ok && res.data?.status === 'finished' && res.data.opponent) {
        finishWith(res.data.opponent, outcome);
        return;
      }
      if (!res.ok && res.error === 'EXPIRED') {
        patch({ phase: 'expired' });
        return;
      }
      // حتی با خطای شبکه وارد انتظار می‌شویم (نتیجه محلی محفوظ است) — offline-first
      patch({ phase: 'waiting' });
      startPolling();
    },

    markShareInitiated(): void {
      deps.bus?.emit({ type: 'share_initiated', surface: 'duel' });
    },

    async rematch(): Promise<void> {
      stopPolling();
      state = { ...initialState(true) };
      await this.createDuel();
    },

    async retry(): Promise<void> {
      await this.enter(lastPath);
    },

    dispose(): void {
      stopPolling();
      listeners.clear();
    },
  };
}

/** seed قطعی مشتق از duelId (FNV-1a) — آداپتور موقت تا RFC-0002 */
export function seedFromDuelId(duelId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < duelId.length; i++) {
    h ^= duelId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 1_000_000;
}
