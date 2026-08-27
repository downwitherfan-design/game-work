/**
 * @dordaneh/meta-retention — مالک: AI-08.
 * استریک مهربان + فریز، آمار، دستاوردها، گنجینه (مرور فاصله‌دار)،
 * روز دُردانه، موزاییک هفتگی، نوتیفیکیشن یادآور opt-in.
 * پیاده‌سازی طبق docs/02_CONTRACTS.md §5، §6 — اصل حاکم: عادتِ مهربان، نه اعتیاد بی‌رحم.
 */

// تایپ‌های عمومی
export type {
  StreakState,
  StreakUpdate,
  StatsState,
  DailyResult,
  NotificationPrefs,
  AlbumState,
  DiscoveredCard,
  ReviewState,
  AchievementDef,
  EarnedAchievement,
  Clock,
} from './types';

// استریک
export {
  createInitialStreak,
  sanitizeStreak,
  recordDailyPlay,
  effectiveStreak,
  mosaicProgress,
  FREEZE_EARN_INTERVAL,
  MAX_FREEZES,
  MOSAIC_PIECES,
} from './streak';

// آمار
export {
  createInitialStats,
  sanitizeStats,
  recordResult,
  winRate,
  suggestedReminderHour,
  shouldAskNotifPermission,
  DEFAULT_REMINDER_HOUR,
  NOTIF_ASK_STREAK,
} from './stats';

// دستاوردها
export { ACHIEVEMENTS, evaluateAchievements, type AchievementContext } from './achievements';

// آلبوم و مرور فاصله‌دار
export {
  createInitialAlbum,
  sanitizeAlbum,
  discoverCard,
  grantEndowedCards,
  dueReviews,
  markReviewed,
  albumProgress,
  REVIEW_INTERVALS,
  ENDOWED_CARDS,
  REVIEW_BATCH,
} from './album';

// روز دُردانه (پاداش متغیر)
export { isDordanehDay, hashPuzzleNumber } from './dordaneh-day';

// تقویم شمسی
export {
  jalaliForPuzzleNumber,
  dateForPuzzleNumber,
  buildMonthCalendar,
  jalaliMonthLength,
  iranWeekday,
  JALALI_MONTHS,
  type JalaliDate,
  type MonthCalendar,
  type CalendarCell,
} from './jalali';

// نوتیفیکیشن
export {
  createCapacitorGate,
  createNoopGate,
  nextReminderAt,
  reminderMessageIndex,
  REMINDER_NOTIFICATION_ID,
  REMINDER_MESSAGE_COUNT,
  type NotificationGate,
} from './notifications';

// ساعت
export { createSystemClock, createFixedClock, tehranHourForDate, type MutableClock } from './clock';

// سرویس (wiring — app-shell این را صدا می‌زند)
export {
  createMetaRetention,
  type MetaRetentionApi,
  type MetaRetentionDeps,
  type GoldenQuery,
  type AchievementListener,
  type FreezeListener,
} from './service';

// صفحه‌های قراردادی (§6)
export { StatsScreen, type StatsScreenProps } from './ui/StatsScreen';
export { AlbumScreen, type AlbumScreenProps } from './ui/AlbumScreen';
export { MosaicTile, type MosaicTileProps } from './ui/MosaicTile';

// i18n پکیج
export { messages, t } from './i18n';
