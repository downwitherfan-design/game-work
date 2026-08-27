/**
 * سرویس متا-ریتنشن — نقطه‌ی wiring پکیج:
 * به EventBus گوش می‌دهد (puzzle_finished, card_revealed)، استریک/آمار/آلبوم را
 * در StorageApi (کلیدهای رزروشده) نگه می‌دارد و streak_changed منتشر می‌کند.
 * app-shell (AI-05) فقط createMetaRetention را با وابستگی‌های قراردادی صدا می‌زند.
 */
import type { EventBus, StorageApi } from '@dordaneh/contracts';
import { STORAGE_KEYS, toPersianDigits } from '@dordaneh/contracts';
import type {
  AlbumState,
  Clock,
  EarnedAchievement,
  StatsState,
  StreakState,
  StreakUpdate,
} from './types';
import { createSystemClock } from './clock';
import { effectiveStreak, recordDailyPlay, sanitizeStreak } from './streak';
import {
  recordResult,
  sanitizeStats,
  shouldAskNotifPermission,
  suggestedReminderHour,
} from './stats';
import { evaluateAchievements } from './achievements';
import { discoverCard, dueReviews, grantEndowedCards, markReviewed, sanitizeAlbum } from './album';
import { isDordanehDay } from './dordaneh-day';
import {
  createNoopGate,
  nextReminderAt,
  REMINDER_NOTIFICATION_ID,
  reminderMessageIndex,
  type NotificationGate,
} from './notifications';

/** قرارداد کمینه برای پرس‌وجوی نسخه‌ی طلایی — فقط MonetizationApi.isGolden() */
export interface GoldenQuery {
  isGolden(): boolean;
}

export interface MetaRetentionDeps {
  bus: EventBus;
  storage: StorageApi;
  /** null = هنوز monetization وایر نشده (کاربر عادی فرض می‌شود) */
  monetization?: GoldenQuery | null;
  clock?: Clock;
  notifications?: NotificationGate;
  /** ترجمه‌ی متن نوتیف — از locale پکیج (t قراردادی) */
  t?: (key: string, params?: Record<string, string | number>) => string;
}

/** رویداد داخلی UI: کسب دستاورد (برای Toast + confetti) */
export type AchievementListener = (earned: EarnedAchievement[]) => void;
/** رویداد داخلی UI: پیام مهربان فریز */
export type FreezeListener = (info: { consumed: number; streak: number }) => void;

export interface MetaRetentionApi {
  /** وضعیت‌ها (کپی امن) */
  getStreak(): StreakState;
  getStats(): StatsState;
  getAlbum(): AlbumState;
  /** استریک نمایشی امروز (با درنظرگرفتن فریزهای موجود) */
  getEffectiveStreak(): number;
  /** آیا معمای امروز «روز دُردانه» است؟ (فقط بعد از حل به UI بگویید) */
  isTodayDordaneh(): boolean;
  /** کشف کارت هدیه‌ی پیشرفت اعطاشده در اولین بازدید گنجینه */
  grantEndowed(firstCardIds: readonly string[]): string[];
  /** کارت‌های موعد «مرور امروز» */
  getDueReviews(): string[];
  /** ثبت مرور یک کارت */
  markCardReviewed(cardId: string): void;
  /** آیا الان لحظه‌ی مناسب درخواست اجازه‌ی نوتیف است؟ */
  shouldAskNotificationPermission(): boolean;
  /** درخواست اجازه + روشن‌کردن یادآور (ساعت از الگوی کاربر) */
  enableReminders(): Promise<boolean>;
  /** خاموش‌کردن آسان (خط قرمز مهربانی) */
  disableReminders(): Promise<void>;
  /** ثبت اینکه از کاربر پرسیدیم (حتی اگر رد کرد — دیگر نمی‌پرسیم) */
  markNotifAsked(): void;
  /** ساعت پیشنهادی یادآور (میانه‌ی الگوی بازی) */
  getSuggestedReminderHour(): number;
  /** شنونده‌ی کسب دستاورد (Toast/confetti در UI) */
  onAchievements(cb: AchievementListener): () => void;
  /** شنونده‌ی مصرف فریز (پیام مهربان) */
  onFreeze(cb: FreezeListener): () => void;
  /** پاک‌سازی شنونده‌های EventBus */
  dispose(): void;
}

export function createMetaRetention(deps: MetaRetentionDeps): MetaRetentionApi {
  const clock = deps.clock ?? createSystemClock();
  const gate = deps.notifications ?? createNoopGate();
  const t = deps.t ?? ((key: string) => key);
  const isGolden = (): boolean => {
    try {
      return deps.monetization?.isGolden() === true;
    } catch {
      return false;
    }
  };

  // --- بارگذاری اولیه (fail-soft) ---
  let streak = sanitizeStreak(deps.storage.get(STORAGE_KEYS.streak));
  let stats = sanitizeStats(deps.storage.get(STORAGE_KEYS.stats));
  let album = sanitizeAlbum(deps.storage.get(STORAGE_KEYS.album));

  const saveStreak = (): void => deps.storage.set(STORAGE_KEYS.streak, streak);
  const saveStats = (): void => deps.storage.set(STORAGE_KEYS.stats, stats);
  const saveAlbum = (): void => deps.storage.set(STORAGE_KEYS.album, album);

  const achievementListeners = new Set<AchievementListener>();
  const freezeListeners = new Set<FreezeListener>();

  let lastSolveHour: number | null = null;
  let lastDurationMs: number | null = null;

  const runAchievements = (): void => {
    const { stats: nextStats, earned } = evaluateAchievements(
      {
        stats,
        streak,
        discoveredCards: Object.keys(album.discovered).length,
        lastSolveHour,
        lastDurationMs,
      },
      clock.now(),
    );
    if (earned.length > 0) {
      stats = nextStats;
      saveStats();
      for (const cb of [...achievementListeners]) {
        try {
          cb(earned);
        } catch {
          /* fail-soft */
        }
      }
    }
  };

  const scheduleReminder = (): void => {
    const next = nextReminderAt(stats, clock);
    if (!next) return;
    const idx = reminderMessageIndex(next.forPuzzleNumber);
    const streakText =
      streak.current > 1 ? toPersianDigits(streak.current) : toPersianDigits(1);
    void gate
      .schedule({
        id: REMINDER_NOTIFICATION_ID,
        title: t('metaRetention.notif.title'),
        body: t(`metaRetention.notif.msg${idx}`, { streak: streakText }),
        at: next.at,
      })
      .then(() => {
        stats = { ...stats, notif: { ...stats.notif, lastScheduledFor: next.forPuzzleNumber } };
        saveStats();
      });
  };

  // --- گوش‌دادن به puzzle_finished (فقط معمای روزانه: puzzleId = 'daily-<n>') ---
  const offFinished = deps.bus.on('puzzle_finished', (e) => {
    const m = /^daily-(\d+)$/.exec(e.puzzleId);
    if (!m) return; // تمرین/دوئل در استریک روزانه نمی‌آید
    const puzzleNumber = Number(m[1]);
    const today = clock.puzzleNumber();
    // فقط معمای امروز استریک می‌سازد (بازی آرشیوی استریک نمی‌دهد)
    if (puzzleNumber !== today) return;

    lastSolveHour = clock.tehranHour();
    lastDurationMs = e.durationMs;

    // ۱) استریک
    const update: StreakUpdate = recordDailyPlay(streak, puzzleNumber, isGolden());
    streak = update.state;
    if (update.changed) {
      saveStreak();
      deps.bus.emit({ type: 'streak_changed', value: streak.current, frozen: update.frozen });
      if (update.freezesConsumed > 0) {
        for (const cb of [...freezeListeners]) {
          try {
            cb({ consumed: update.freezesConsumed, streak: streak.current });
          } catch {
            /* fail-soft */
          }
        }
      }
    }

    // ۲) آمار
    stats = recordResult(
      stats,
      { puzzleNumber, won: e.won, guessCount: e.guessCount },
      lastSolveHour,
    );
    if (e.won && isDordanehDay(puzzleNumber)) {
      stats = { ...stats, dordanehDaysWon: stats.dordanehDaysWon + 1 };
    }
    saveStats();

    // ۳) دستاوردها + یادآور فردا
    runAchievements();
    scheduleReminder();
  });

  // --- کشف کارت فرهنگی (card_revealed از game-board پس از حل) ---
  const offCard = deps.bus.on('card_revealed', (e) => {
    const today = clock.puzzleNumber();
    const golden = isDordanehDay(today); // روز دُردانه: کارت legendary با قاب طلایی
    const r = discoverCard(album, e.cardId, today, golden);
    if (r.isNew || r.state !== album) {
      album = r.state;
      saveAlbum();
      runAchievements();
    }
  });

  return {
    getStreak: () => ({ ...streak }),
    getStats: () => ({ ...stats, guessDist: [...stats.guessDist] as StatsState['guessDist'] }),
    getAlbum: () => ({
      discovered: { ...album.discovered },
      endowedGranted: album.endowedGranted,
      review: { ...album.review },
    }),
    getEffectiveStreak: () => effectiveStreak(streak, clock.puzzleNumber(), isGolden()),
    isTodayDordaneh: () => isDordanehDay(clock.puzzleNumber()),
    grantEndowed(firstCardIds) {
      const r = grantEndowedCards(album, firstCardIds, clock.puzzleNumber());
      if (r.granted.length > 0 || r.state.endowedGranted !== album.endowedGranted) {
        album = r.state;
        saveAlbum();
        runAchievements();
      }
      return r.granted;
    },
    getDueReviews: () => dueReviews(album, clock.puzzleNumber()),
    markCardReviewed(cardId) {
      const next = markReviewed(album, cardId, clock.puzzleNumber());
      if (next !== album) {
        album = next;
        saveAlbum();
        stats = { ...stats, reviewsDone: stats.reviewsDone + 1 };
        saveStats();
        runAchievements();
      }
    },
    shouldAskNotificationPermission: () =>
      gate.isAvailable() && shouldAskNotifPermission(stats, streak.current),
    async enableReminders() {
      const granted = gate.isAvailable() ? await gate.requestPermission() : false;
      stats = {
        ...stats,
        notif: {
          ...stats.notif,
          asked: true,
          enabled: granted,
          hour: stats.notif.hour ?? suggestedReminderHour(stats),
        },
      };
      saveStats();
      if (granted) scheduleReminder();
      return granted;
    },
    async disableReminders() {
      stats = { ...stats, notif: { ...stats.notif, enabled: false } };
      saveStats();
      await gate.cancel(REMINDER_NOTIFICATION_ID);
    },
    markNotifAsked() {
      if (stats.notif.asked) return;
      stats = { ...stats, notif: { ...stats.notif, asked: true } };
      saveStats();
    },
    getSuggestedReminderHour: () => suggestedReminderHour(stats),
    onAchievements(cb) {
      achievementListeners.add(cb);
      return () => achievementListeners.delete(cb);
    },
    onFreeze(cb) {
      freezeListeners.add(cb);
      return () => freezeListeners.delete(cb);
    },
    dispose() {
      offFinished();
      offCard();
      achievementListeners.clear();
      freezeListeners.clear();
    },
  };
}
