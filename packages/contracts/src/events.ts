/**
 * @dordaneh/contracts — EventBus contract + reference lightweight implementation.
 * Source of truth: docs/02_CONTRACTS.md §5. Locked (RFC only).
 */

export type AppEvent =
  | { type: 'puzzle_started'; puzzleId: string; mode: 'daily' | 'practice' | 'duel' }
  | { type: 'guess_submitted'; puzzleId: string; guessIndex: number }
  | {
      type: 'puzzle_finished';
      puzzleId: string;
      won: boolean;
      guessCount: number;
      durationMs: number;
    }
  | { type: 'card_revealed'; cardId: string }
  | { type: 'share_initiated'; surface: 'result' | 'card' | 'streak' | 'duel' }
  | { type: 'share_completed'; surface: string }
  | { type: 'streak_changed'; value: number; frozen: boolean }
  | { type: 'reward_ad_requested'; placement: 'extra_guess' | 'hint' }
  | { type: 'reward_ad_completed'; placement: string }
  | { type: 'purchase_completed'; sku: string }
  | { type: 'screen_viewed'; screen: string };

export interface EventBus {
  emit(e: AppEvent): void;
  on<T extends AppEvent['type']>(
    type: T,
    cb: (e: Extract<AppEvent, { type: T }>) => void,
  ): () => void;
}

type AnyListener = (e: AppEvent) => void;

/**
 * پیاده‌سازی مرجعِ سبک EventBus — بدون وابستگی، ایمن در برابر خطای listener.
 * app-shell (AI-05) این را wire می‌کند؛ بقیه فقط تایپ EventBus را مصرف می‌کنند.
 */
export function createEventBus(): EventBus {
  const listeners = new Map<AppEvent['type'], Set<AnyListener>>();
  return {
    emit(e: AppEvent): void {
      const set = listeners.get(e.type);
      if (!set) return;
      for (const cb of [...set]) {
        try {
          cb(e);
        } catch (err) {
          // یک listener خراب نباید بقیه را بشکند (offline-first, fail-soft)
          console.error('[EventBus] listener error for', e.type, err);
        }
      }
    },
    on<T extends AppEvent['type']>(
      type: T,
      cb: (e: Extract<AppEvent, { type: T }>) => void,
    ): () => void {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      const anyCb = cb as AnyListener;
      set.add(anyCb);
      return () => {
        set.delete(anyCb);
      };
    },
  };
}
