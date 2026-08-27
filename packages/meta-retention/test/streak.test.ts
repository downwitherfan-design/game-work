/**
 * تست‌های منطق استریک — DoD: ۱۰۰٪ شاخه‌ها + تست‌های صریح مرز روز (تغییر puzzleNumber).
 */
import { describe, expect, it } from 'vitest';
import {
  createInitialStreak,
  effectiveStreak,
  FREEZE_EARN_INTERVAL,
  MAX_FREEZES,
  mosaicProgress,
  recordDailyPlay,
  sanitizeStreak,
} from '../src/streak';
import type { StreakState } from '../src/types';

/** اجرای متوالی روزها روی state */
function playDays(start: StreakState, days: number[], isGolden = false): StreakState {
  let s = start;
  for (const d of days) s = recordDailyPlay(s, d, isGolden).state;
  return s;
}

describe('recordDailyPlay — پایه', () => {
  it('اولین بازی عمر → استریک ۱', () => {
    const u = recordDailyPlay(createInitialStreak(), 100, false);
    expect(u.state.current).toBe(1);
    expect(u.state.best).toBe(1);
    expect(u.state.lastPlayedPuzzleNumber).toBe(100);
    expect(u.changed).toBe(true);
    expect(u.reset).toBe(false);
    expect(u.frozen).toBe(false);
  });

  it('روز پشت‌سرهم (مرز روز: n → n+1) → +۱', () => {
    const s = playDays(createInitialStreak(), [100, 101, 102]);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });

  it('بازی دوباره در همان روز → بدون تغییر (changed=false)', () => {
    const s1 = playDays(createInitialStreak(), [100]);
    const u = recordDailyPlay(s1, 100, false);
    expect(u.changed).toBe(false);
    expect(u.state.current).toBe(1);
  });

  it('puzzleNumber از گذشته (ساعت دستکاری‌شده) → بدون تغییر', () => {
    const s1 = playDays(createInitialStreak(), [100, 101]);
    const u = recordDailyPlay(s1, 99, false);
    expect(u.changed).toBe(false);
    expect(u.state.current).toBe(2);
  });

  it('best فقط بالا می‌رود، پایین نمی‌آید', () => {
    let s = playDays(createInitialStreak(), [1, 2, 3, 4, 5]); // best=5
    s = recordDailyPlay(s, 10, false).state; // reset → current=1
    expect(s.current).toBe(1);
    expect(s.best).toBe(5);
  });
});

describe('Streak Freeze — خط قرمز ۱۵: هرگز استریک بی‌رحم', () => {
  it('هر ۷ روز استریک → ۱ فریز رایگان', () => {
    const days = Array.from({ length: 7 }, (_, i) => 100 + i);
    const s = playDays(createInitialStreak(), days);
    expect(s.current).toBe(7);
    expect(s.freezes).toBe(1);
    expect(s.lastFreezeEarnMilestone).toBe(7);
  });

  it('روز ۷ فریز می‌دهد اما روز ۸..۱۳ نه (مایل‌استون تکراری نیست)', () => {
    const days = Array.from({ length: 13 }, (_, i) => 100 + i);
    const s = playDays(createInitialStreak(), days);
    expect(s.freezes).toBe(1);
    const s14 = recordDailyPlay(s, 113, false);
    expect(s14.state.freezes).toBe(2);
    expect(s14.freezeEarned).toBe(true);
  });

  it('سقف ذخیره‌ی فریز = ۲ (روز ۲۱ فریز سوم نمی‌دهد)', () => {
    const days = Array.from({ length: 21 }, (_, i) => 100 + i);
    const s = playDays(createInitialStreak(), days);
    expect(s.current).toBe(21);
    expect(s.freezes).toBe(MAX_FREEZES);
    // اما موزاییک سوم را می‌گیرد
    expect(s.mosaicsCompleted).toBe(3);
  });

  it('یک روز غیبت با ۱ فریز → فریز مصرف، استریک زنده و +۱', () => {
    const s7 = playDays(createInitialStreak(), [100, 101, 102, 103, 104, 105, 106]); // فریز=۱
    const u = recordDailyPlay(s7, 108, false); // گپ ۱ روزه (۱۰۷ غایب)
    expect(u.frozen).toBe(true);
    expect(u.freezesConsumed).toBe(1);
    expect(u.state.current).toBe(8);
    expect(u.state.freezes).toBe(0);
    expect(u.state.freezesUsedTotal).toBe(1);
    expect(u.reset).toBe(false);
  });

  it('دو روز غیبت با ۲ فریز → هر دو مصرف، استریک زنده', () => {
    const days = Array.from({ length: 14 }, (_, i) => 100 + i); // فریز=۲
    const s14 = playDays(createInitialStreak(), days);
    expect(s14.freezes).toBe(2);
    const u = recordDailyPlay(s14, 116, false); // ۱۱۴ و ۱۱۵ غایب
    expect(u.frozen).toBe(true);
    expect(u.freezesConsumed).toBe(2);
    expect(u.state.current).toBe(15);
    expect(u.state.freezes).toBe(0);
  });

  it('غیبت بیشتر از فریز موجود → reset مهربان به ۱ (نه صفر)', () => {
    const s7 = playDays(createInitialStreak(), [100, 101, 102, 103, 104, 105, 106]); // فریز=۱
    const u = recordDailyPlay(s7, 110, false); // ۳ روز غایب، فقط ۱ فریز
    expect(u.reset).toBe(true);
    expect(u.frozen).toBe(false);
    expect(u.state.current).toBe(1);
    expect(u.state.best).toBe(7);
    // فریزها هدر نمی‌روند (مصرف فقط وقتی نجات می‌دهد)
    expect(u.state.freezes).toBe(1);
    // مایل‌استون از نو — دوباره در استریک ۷ فریز/موزاییک می‌گیرد
    expect(u.state.lastFreezeEarnMilestone).toBe(0);
  });

  it('پس از reset، مایل‌استون ۷ دوباره فریز می‌دهد', () => {
    const s7 = playDays(createInitialStreak(), [100, 101, 102, 103, 104, 105, 106]);
    let s = recordDailyPlay(s7, 120, false).state; // reset با فریز=۱ باقی‌مانده
    s = playDays(s, [121, 122, 123, 124, 125, 126]); // استریک دوباره ۷
    expect(s.current).toBe(7);
    expect(s.freezes).toBe(2); // ۱ قبلی + ۱ جدید
    expect(s.mosaicsCompleted).toBe(2);
  });

  it('نسخه‌ی طلایی: گپ بلند بدون فریز → استریک زنده (فریز نامحدود)', () => {
    const s3 = playDays(createInitialStreak(), [100, 101, 102], true);
    expect(s3.freezes).toBe(0);
    const u = recordDailyPlay(s3, 110, true); // ۷ روز غایب، صفر فریز ذخیره
    expect(u.frozen).toBe(true);
    expect(u.freezesConsumed).toBe(0); // ذخیره کم نمی‌شود
    expect(u.state.current).toBe(4);
    expect(u.reset).toBe(false);
  });
});

describe('موزاییک هفتگی', () => {
  it('هر ۷ روز یک موزاییک کامل (mosaicCompleted=true فقط در مایل‌استون)', () => {
    let s = createInitialStreak();
    const flags: boolean[] = [];
    for (let d = 100; d < 115; d++) {
      const u = recordDailyPlay(s, d, false);
      flags.push(u.mosaicCompleted);
      s = u.state;
    }
    // روزهای ۷ و ۱۴ (ایندکس ۶ و ۱۳)
    expect(flags[6]).toBe(true);
    expect(flags[13]).toBe(true);
    expect(flags.filter(Boolean)).toHaveLength(2);
    expect(s.mosaicsCompleted).toBe(2);
  });

  it('mosaicProgress: قطعات = استریک mod 7', () => {
    expect(mosaicProgress(0)).toEqual({ pieces: 0, total: 7 });
    expect(mosaicProgress(3)).toEqual({ pieces: 3, total: 7 });
    expect(mosaicProgress(7)).toEqual({ pieces: 0, total: 7 });
    expect(mosaicProgress(10)).toEqual({ pieces: 3, total: 7 });
  });

  it('FREEZE_EARN_INTERVAL برابر ۷ است (هم‌راستا با موزاییک)', () => {
    expect(FREEZE_EARN_INTERVAL).toBe(7);
  });
});

describe('effectiveStreak — نمایش صادقانه', () => {
  it('هرگز بازی نکرده → ۰', () => {
    expect(effectiveStreak(createInitialStreak(), 100, false)).toBe(0);
  });

  it('امروز بازی کرده → current', () => {
    const s = playDays(createInitialStreak(), [100, 101]);
    expect(effectiveStreak(s, 101, false)).toBe(2);
  });

  it('دیروز بازی کرده (هنوز فرصت امروز هست) → current', () => {
    const s = playDays(createInitialStreak(), [100, 101]);
    expect(effectiveStreak(s, 102, false)).toBe(2);
  });

  it('یک روز غیبت با فریز کافی → زنده', () => {
    const s7 = playDays(createInitialStreak(), [100, 101, 102, 103, 104, 105, 106]);
    expect(effectiveStreak(s7, 108, false)).toBe(7);
  });

  it('غیبت بیش از فریز → ۰', () => {
    const s = playDays(createInitialStreak(), [100, 101]); // فریز=۰
    expect(effectiveStreak(s, 104, false)).toBe(0);
  });

  it('طلایی: هر گپی → زنده', () => {
    const s = playDays(createInitialStreak(), [100, 101]);
    expect(effectiveStreak(s, 150, true)).toBe(2);
  });
});

describe('sanitizeStreak — fail-soft', () => {
  it('null/undefined/رشته → state اولیه', () => {
    expect(sanitizeStreak(null)).toEqual(createInitialStreak());
    expect(sanitizeStreak(undefined)).toEqual(createInitialStreak());
    expect(sanitizeStreak('junk')).toEqual(createInitialStreak());
  });

  it('اعداد منفی/NaN → مقادیر امن', () => {
    const s = sanitizeStreak({ current: -5, best: NaN, freezes: 99, lastPlayedPuzzleNumber: 12.7 });
    expect(s.current).toBe(0);
    expect(s.best).toBe(0);
    expect(s.freezes).toBe(MAX_FREEZES); // سقف
    expect(s.lastPlayedPuzzleNumber).toBe(12);
  });

  it('state سالم دست‌نخورده می‌ماند', () => {
    const valid = playDays(createInitialStreak(), [100, 101, 102, 103, 104, 105, 106]);
    expect(sanitizeStreak(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it('lastPlayedPuzzleNumber نامعتبر → null', () => {
    expect(sanitizeStreak({ lastPlayedPuzzleNumber: 'x' }).lastPlayedPuzzleNumber).toBeNull();
    expect(sanitizeStreak({ lastPlayedPuzzleNumber: Infinity }).lastPlayedPuzzleNumber).toBeNull();
  });
});
