/**
 * دستاوردها — ۲۰ دستاورد با نام‌های فارسی بامزه.
 * مبنا: هدف‌گذاری Locke & Latham (1990) — اهداف مشخصِ چالشی عملکرد را بالا می‌برند.
 * نام/توضیح هر دستاورد در locales/fa.json (خط قرمز ۲۲: بدون رشته‌ی هاردکد در UI).
 */
import type { AchievementDef, EarnedAchievement, StatsState, StreakState } from './types';

/** ورودی ارزیابی دستاوردها پس از هر رویداد */
export interface AchievementContext {
  stats: StatsState;
  streak: StreakState;
  /** تعداد کارت‌های کشف‌شده‌ی آلبوم */
  discoveredCards: number;
  /** ساعت تهران هنگام آخرین حل (برای شب‌زنده‌دار/سحرخیز) */
  lastSolveHour: number | null;
  /** مدت‌زمان حل آخرین معما به میلی‌ثانیه */
  lastDurationMs: number | null;
}

type Predicate = (ctx: AchievementContext) => boolean;

interface InternalDef extends AchievementDef {
  check: Predicate;
}

const w = (ctx: AchievementContext) => ctx.stats.lastResult?.won === true;

/**
 * تعریف ۲۰ دستاورد. id ثابت است (کلید ذخیره و locale)؛
 * ترتیب = ترتیب نمایش در StatsScreen.
 */
const DEFS: InternalDef[] = [
  // شروع سفر
  { id: 'first_win', icon: '🏅', check: (c) => c.stats.gamesWon >= 1 },
  { id: 'first_card', icon: '🎴', check: (c) => c.discoveredCards >= 1 },
  // مهارت حدس
  { id: 'sniper', icon: '🎯', check: (c) => w(c) && c.stats.lastResult?.guessCount === 1 },
  { id: 'sharp_eye', icon: '👁️', check: (c) => w(c) && (c.stats.lastResult?.guessCount ?? 9) <= 2 },
  { id: 'photo_finish', icon: '😅', check: (c) => w(c) && c.stats.lastResult?.guessCount === 6 },
  {
    id: 'lightning',
    icon: '⚡',
    check: (c) => w(c) && c.lastDurationMs !== null && c.lastDurationMs <= 60_000,
  },
  // ساعت‌های خاص
  {
    id: 'night_owl',
    icon: '🦉',
    check: (c) => w(c) && c.lastSolveHour !== null && c.lastSolveHour >= 0 && c.lastSolveHour < 4,
  },
  {
    id: 'early_bird',
    icon: '🐓',
    check: (c) => w(c) && c.lastSolveHour !== null && c.lastSolveHour >= 4 && c.lastSolveHour < 7,
  },
  // استریک — شیب هدف (Kivetz et al. 2006): پله‌های ۳/۷/۱۴/۴۰/۱۰۰
  { id: 'warm_up', icon: '🌱', check: (c) => c.streak.best >= 3 },
  { id: 'full_week', icon: '📅', check: (c) => c.streak.best >= 7 },
  { id: 'two_weeks', icon: '🔥', check: (c) => c.streak.best >= 14 },
  { id: 'chelleh', icon: '🧘', check: (c) => c.streak.best >= 40 },
  { id: 'centurion', icon: '💯', check: (c) => c.streak.best >= 100 },
  { id: 'ice_breaker', icon: '❄️', check: (c) => c.streak.freezesUsedTotal >= 1 },
  { id: 'mosaic_master', icon: '🕌', check: (c) => c.streak.mosaicsCompleted >= 4 },
  // پیوستگی و حجم
  { id: 'perfect_ten', icon: '🌟', check: (c) => c.stats.winsInRow >= 10 },
  { id: 'veteran', icon: '🎖️', check: (c) => c.stats.gamesPlayed >= 50 },
  // گنجینه و یادگیری
  { id: 'collector', icon: '🗝️', check: (c) => c.discoveredCards >= 30 },
  { id: 'scholar', icon: '📚', check: (c) => c.stats.reviewsDone >= 10 },
  // روز دُردانه
  { id: 'lucky_day', icon: '💎', check: (c) => c.stats.dordanehDaysWon >= 1 },
];

export const ACHIEVEMENTS: readonly AchievementDef[] = DEFS.map(({ id, icon }) => ({ id, icon }));

/**
 * ارزیابی دستاوردها — دستاوردهای «تازه کسب‌شده» را برمی‌گرداند و
 * achievements داخل stats را (immutable) به‌روز می‌کند.
 */
export function evaluateAchievements(
  ctx: AchievementContext,
  nowMs: number,
): { stats: StatsState; earned: EarnedAchievement[] } {
  const earned: EarnedAchievement[] = [];
  let achievements = ctx.stats.achievements;
  for (const def of DEFS) {
    if (achievements[def.id] !== undefined) continue; // قبلاً کسب شده
    if (def.check(ctx)) {
      if (achievements === ctx.stats.achievements) achievements = { ...achievements };
      achievements[def.id] = nowMs;
      earned.push({ id: def.id, earnedAt: nowMs });
    }
  }
  if (earned.length === 0) return { stats: ctx.stats, earned };
  return { stats: { ...ctx.stats, achievements }, earned };
}
