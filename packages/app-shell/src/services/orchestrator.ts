/**
 * ارکستراسیون پوسته:
 *  ۱) wiring آنالیتیکس: تنها جایی که AnalyticsApi.track به EventBus وصل می‌شود (§8).
 *  ۲) جریان پس از حل: puzzle_finished → کارت فرهنگی → استریک → پیشنهاد اشتراک.
 *     (فقط ترتیب — UI هر مرحله مال مالکش است.)
 *  ۳) بازیابی جلسه: state معمای نیمه‌کاره در Storage (Hooked: ساده‌سازی Action).
 *  ۴) بج «۱» تب آلبوم وقتی کارت تازه کشف شده (اثر زایگارنیک ۱۹۲۷).
 */
import {
  STORAGE_KEYS,
  type AppEvent,
  type CultureCard,
  type EventBus,
} from '@dordaneh/contracts';
import type { ShellServices } from './registry';
import type { ShellStorage } from '../core/storage';

/** کلیدهای داخلی پوسته (خارج از کلیدهای رزروشده‌ی ماژول‌های دیگر) */
export const SHELL_KEYS = {
  /** جلسه‌ی نیمه‌کاره: { puzzleId, route } */
  session: 'dor.shell.session',
  /** آیا آنبوردینگ کامل شده؟ */
  onboarded: 'dor.shell.onboarded',
  /** بج کارت تازه‌ی آلبوم (زایگارنیک) */
  albumBadge: 'dor.shell.albumBadge',
} as const;

export interface ActiveSession {
  puzzleId: string;
  route: string;
}

export interface PostSolveStep {
  step: 'culture_card' | 'streak_update' | 'share_prompt';
  card?: CultureCard;
}

export interface Orchestrator {
  /** پاک‌سازی همه‌ی subscriptionها */
  dispose(): void;
  /** جلسه‌ی نیمه‌کاره (اگر هست) برای بازیابی */
  getResumableSession(): ActiveSession | null;
  /** بج آلبوم فعال است؟ */
  hasAlbumBadge(): boolean;
  clearAlbumBadge(): void;
  isOnboarded(): boolean;
  markOnboarded(): void;
  /** ترتیب مراحل پس از حل برای مصرف UI — پر می‌شود با puzzle_finished */
  onPostSolve(cb: (steps: PostSolveStep[]) => void): () => void;
}

function puzzleNumberFromId(puzzleId: string): number {
  const m = /-(\d+)(?:-\d+)?$/.exec(puzzleId);
  return m ? Number(m[1]) : 0;
}

export function createOrchestrator(
  bus: EventBus,
  services: ShellServices,
  storage: ShellStorage,
): Orchestrator {
  const unsubs: Array<() => void> = [];
  const postSolveCbs = new Set<(steps: PostSolveStep[]) => void>();

  // --- ۱) wiring آنالیتیکس: همه‌ی رویدادهای قرارداد → track (فقط این‌جا) ---
  const ALL_EVENT_TYPES: AppEvent['type'][] = [
    'puzzle_started',
    'guess_submitted',
    'puzzle_finished',
    'card_revealed',
    'share_initiated',
    'share_completed',
    'streak_changed',
    'reward_ad_requested',
    'reward_ad_completed',
    'purchase_completed',
    'screen_viewed',
  ];
  for (const type of ALL_EVENT_TYPES) {
    unsubs.push(bus.on(type, (e) => services.analytics.track(e)));
  }

  // --- ۳) بازیابی جلسه: شروع معما → ثبت؛ پایان → پاک ---
  unsubs.push(
    bus.on('puzzle_started', (e) => {
      const route = e.mode === 'practice' ? '/practice' : e.mode === 'duel' ? '/duel' : '/';
      storage.set<ActiveSession>(SHELL_KEYS.session, { puzzleId: e.puzzleId, route });
    }),
  );

  // --- ۲) جریان پس از حل + ۴) بج آلبوم ---
  unsubs.push(
    bus.on('puzzle_finished', (e) => {
      storage.set<ActiveSession | null>(SHELL_KEYS.session, null);

      const steps: PostSolveStep[] = [];
      if (e.won) {
        // کارت فرهنگی (culture-cards مالک UI/محتواست؛ ما فقط ترتیب می‌چینیم)
        const state = services.engine.getState(e.puzzleId);
        const card = services.culture.getCardForPuzzle(
          puzzleNumberFromId(e.puzzleId),
          state.solution ?? '',
        );
        steps.push({ step: 'culture_card', card });

        // آلبوم: ثبت کشف + بج زایگارنیک
        const album = storage.get<string[]>(STORAGE_KEYS.album) ?? [];
        if (!album.includes(card.id)) {
          album.push(card.id);
          storage.set(STORAGE_KEYS.album, album);
          storage.set(SHELL_KEYS.albumBadge, true);
        }
        bus.emit({ type: 'card_revealed', cardId: card.id });
      }
      // به‌روزرسانی استریک (UI و منطق مال meta-retention — ما ترتیب را می‌چینیم)
      steps.push({ step: 'streak_update' });
      // پیشنهاد اشتراک (viral-share)
      steps.push({ step: 'share_prompt' });

      for (const cb of [...postSolveCbs]) {
        try {
          cb(steps);
        } catch (err) {
          console.error('[orchestrator] post-solve callback error', err);
        }
      }
    }),
  );

  return {
    dispose(): void {
      for (const u of unsubs) u();
      unsubs.length = 0;
      postSolveCbs.clear();
    },
    getResumableSession(): ActiveSession | null {
      const s = storage.get<ActiveSession | null>(SHELL_KEYS.session);
      if (!s || typeof s.puzzleId !== 'string') return null;
      // فقط اگر واقعاً هنوز در حال بازی است
      const st = services.engine.getState(s.puzzleId);
      return st.status === 'playing' && st.guesses.length > 0 ? s : null;
    },
    hasAlbumBadge(): boolean {
      return storage.get<boolean>(SHELL_KEYS.albumBadge) === true;
    },
    clearAlbumBadge(): void {
      storage.set(SHELL_KEYS.albumBadge, false);
    },
    isOnboarded(): boolean {
      return storage.get<boolean>(SHELL_KEYS.onboarded) === true;
    },
    markOnboarded(): void {
      storage.set(SHELL_KEYS.onboarded, true);
    },
    onPostSolve(cb): () => void {
      postSolveCbs.add(cb);
      return () => postSolveCbs.delete(cb);
    },
  };
}
