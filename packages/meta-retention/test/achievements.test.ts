import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements, type AchievementContext } from '../src/achievements';
import { createInitialStats, recordResult } from '../src/stats';
import { createInitialStreak, recordDailyPlay } from '../src/streak';
import type { StatsState, StreakState } from '../src/types';

function ctx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    stats: createInitialStats(),
    streak: createInitialStreak(),
    discoveredCards: 0,
    lastSolveHour: null,
    lastDurationMs: null,
    ...overrides,
  };
}

function statsWithWin(guessCount: number): StatsState {
  return recordResult(createInitialStats(), { puzzleNumber: 1, won: true, guessCount }, 12);
}

function streakOf(days: number): StreakState {
  let s = createInitialStreak();
  for (let d = 1; d <= days; d++) s = recordDailyPlay(s, d, false).state;
  return s;
}

describe('تعریف دستاوردها', () => {
  it('دقیقاً ۲۰ دستاورد با id یکتا', () => {
    expect(ACHIEVEMENTS).toHaveLength(20);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(20);
  });
});

describe('evaluateAchievements', () => {
  it('حالت اولیه: هیچ دستاوردی کسب نمی‌شود', () => {
    const r = evaluateAchievements(ctx(), 1000);
    expect(r.earned).toEqual([]);
    expect(r.stats.achievements).toEqual({});
  });

  it('اولین برد → first_win (و sharp_eye برای ≤۲ حدس)', () => {
    const r = evaluateAchievements(ctx({ stats: statsWithWin(2) }), 1000);
    const ids = r.earned.map((e) => e.id);
    expect(ids).toContain('first_win');
    expect(ids).toContain('sharp_eye');
    expect(ids).not.toContain('sniper');
    expect(r.stats.achievements['first_win']).toBe(1000);
  });

  it('حل با ۱ حدس → sniper + sharp_eye', () => {
    const ids = evaluateAchievements(ctx({ stats: statsWithWin(1) }), 1).earned.map((e) => e.id);
    expect(ids).toContain('sniper');
    expect(ids).toContain('sharp_eye');
  });

  it('حدس ششم → photo_finish', () => {
    const ids = evaluateAchievements(ctx({ stats: statsWithWin(6) }), 1).earned.map((e) => e.id);
    expect(ids).toContain('photo_finish');
  });

  it('برق‌آسا: حل زیر ۶۰ ثانیه', () => {
    const ids = evaluateAchievements(
      ctx({ stats: statsWithWin(4), lastDurationMs: 45_000 }),
      1,
    ).earned.map((e) => e.id);
    expect(ids).toContain('lightning');
  });

  it('شب‌زنده‌دار (۰..۳) و سحرخیز (۴..۶)', () => {
    const night = evaluateAchievements(
      ctx({ stats: statsWithWin(3), lastSolveHour: 1 }),
      1,
    ).earned.map((e) => e.id);
    expect(night).toContain('night_owl');
    expect(night).not.toContain('early_bird');
    const dawn = evaluateAchievements(
      ctx({ stats: statsWithWin(3), lastSolveHour: 5 }),
      1,
    ).earned.map((e) => e.id);
    expect(dawn).toContain('early_bird');
    expect(dawn).not.toContain('night_owl');
  });

  it('پله‌های استریک: ۳/۷/۱۴/۴۰/۱۰۰ + کاشی‌کار', () => {
    const s40 = streakOf(40);
    const ids = evaluateAchievements(ctx({ streak: s40 }), 1).earned.map((e) => e.id);
    expect(ids).toContain('warm_up');
    expect(ids).toContain('full_week');
    expect(ids).toContain('two_weeks');
    expect(ids).toContain('chelleh');
    expect(ids).not.toContain('centurion');
    expect(ids).toContain('mosaic_master'); // ۴۰/۷ = ۵ موزاییک
  });

  it('یخ‌شکن: پس از اولین مصرف فریز', () => {
    let s = streakOf(7); // فریز=۱
    s = recordDailyPlay(s, 9, false).state; // گپ → مصرف فریز
    expect(s.freezesUsedTotal).toBe(1);
    const ids = evaluateAchievements(ctx({ streak: s }), 1).earned.map((e) => e.id);
    expect(ids).toContain('ice_breaker');
  });

  it('گنج‌یاب (۳۰ کارت) و دانش‌دوست (۱۰ مرور) و خوش‌شانس (روز دُردانه)', () => {
    const stats = { ...createInitialStats(), reviewsDone: 10, dordanehDaysWon: 1 };
    const ids = evaluateAchievements(ctx({ stats, discoveredCards: 30 }), 1).earned.map(
      (e) => e.id,
    );
    expect(ids).toContain('collector');
    expect(ids).toContain('scholar');
    expect(ids).toContain('lucky_day');
    expect(ids).toContain('first_card');
  });

  it('دستاورد تکراری دوباره داده نمی‌شود', () => {
    const first = evaluateAchievements(ctx({ stats: statsWithWin(3) }), 1000);
    const again = evaluateAchievements(
      ctx({ stats: first.stats }),
      2000,
    );
    expect(again.earned).toEqual([]);
    expect(again.stats).toBe(first.stats); // بدون تغییر state
    expect(again.stats.achievements['first_win']).toBe(1000); // زمان اصلی حفظ
  });

  it('بی‌نقص (۱۰ برد پیاپی) و کهنه‌کار (۵۰ بازی)', () => {
    let stats = createInitialStats();
    for (let i = 1; i <= 50; i++) {
      stats = recordResult(stats, { puzzleNumber: i, won: true, guessCount: 3 }, 12);
    }
    const ids = evaluateAchievements(ctx({ stats }), 1).earned.map((e) => e.id);
    expect(ids).toContain('perfect_ten');
    expect(ids).toContain('veteran');
  });
});
