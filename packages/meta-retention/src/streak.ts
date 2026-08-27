/**
 * سیستم استریک «مهربان» — خط قرمز ۱۵: هرگز استریک بی‌رحم.
 *
 * مبنای علمی:
 *  - زیان‌گریزی (Kahneman & Tversky, Prospect Theory, 1979): ترسِ از‌دست‌دادن
 *    استریک انگیزه‌ی بازگشت روزانه می‌سازد.
 *  - اما شکستِ استریک بلند = churn؛ Duolingo با Streak Freeze ریتنشن را بالا برد.
 *
 * قواعد قطعی (بر مبنای puzzleNumber قرارداد — نه ساعت محلی خام):
 *  - بازی امروز، دیروز هم بازی کرده بود → استریک +۱
 *  - بازی دوباره در همان روز → بدون تغییر
 *  - گپِ n روزه → مصرف فریز به‌ازای هر روزِ ازدست‌رفته؛ اگر کافی بود استریک زنده
 *    می‌ماند و امروز +۱ می‌شود؛ نسخه‌ی طلایی = فریز نامحدود (بدون کم‌شدن ذخیره).
 *  - فریز ناکافی → استریک از نو (۱) — با پیام مهربان، نه سرزنش.
 *  - هر ۷ روز استریک → ۱ فریز رایگان (سقف ذخیره: ۲) + تکمیل یک موزاییک ایرانی.
 */
import type { StreakState, StreakUpdate } from './types';

/** هر چند روز استریک، یک فریز رایگان + یک موزاییک کامل */
export const FREEZE_EARN_INTERVAL = 7;
/** سقف ذخیره‌ی فریز برای کاربر عادی */
export const MAX_FREEZES = 2;
/** تعداد قطعات هر موزاییک هفتگی */
export const MOSAIC_PIECES = 7;

export function createInitialStreak(): StreakState {
  return {
    current: 0,
    best: 0,
    lastPlayedPuzzleNumber: null,
    freezes: 0,
    freezesUsedTotal: 0,
    lastFreezeEarnMilestone: 0,
    mosaicsCompleted: 0,
  };
}

/** بازخوانی ایمن از storage — داده‌ی خراب هرگز اپ را نمی‌شکند (fail-soft) */
export function sanitizeStreak(raw: unknown): StreakState {
  const init = createInitialStreak();
  if (typeof raw !== 'object' || raw === null) return init;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
  return {
    current: num(r['current'], init.current),
    best: num(r['best'], init.best),
    lastPlayedPuzzleNumber:
      typeof r['lastPlayedPuzzleNumber'] === 'number' && Number.isFinite(r['lastPlayedPuzzleNumber'])
        ? Math.floor(r['lastPlayedPuzzleNumber'] as number)
        : null,
    freezes: Math.min(num(r['freezes'], init.freezes), MAX_FREEZES),
    freezesUsedTotal: num(r['freezesUsedTotal'], init.freezesUsedTotal),
    lastFreezeEarnMilestone: num(r['lastFreezeEarnMilestone'], init.lastFreezeEarnMilestone),
    mosaicsCompleted: num(r['mosaicsCompleted'], init.mosaicsCompleted),
  };
}

/**
 * ثبت بازیِ روزانه‌ی امروز در استریک.
 * @param state وضعیت فعلی (تغییر نمی‌کند — خروجی state جدید است)
 * @param todayPuzzleNumber شماره‌ی معمای امروز از قرارداد
 * @param isGolden نسخه‌ی طلایی؟ (فریز نامحدود — فقط از MonetizationApi.isGolden())
 */
export function recordDailyPlay(
  state: StreakState,
  todayPuzzleNumber: number,
  isGolden: boolean,
): StreakUpdate {
  const s: StreakState = { ...state };
  const last = s.lastPlayedPuzzleNumber;

  // بازی دوباره در همان روز (یا داده‌ی نامعتبرِ از آینده) → بدون تغییر
  if (last !== null && todayPuzzleNumber <= last) {
    return {
      state: s,
      changed: false,
      freezesConsumed: 0,
      frozen: false,
      reset: false,
      freezeEarned: false,
      mosaicCompleted: false,
    };
  }

  let freezesConsumed = 0;
  let frozen = false;
  let reset = false;

  if (last === null) {
    // اولین بازی عمر
    s.current = 1;
  } else {
    const gap = todayPuzzleNumber - last; // gap=1 یعنی دیروز بازی کرده
    if (gap === 1) {
      s.current += 1;
    } else {
      const missedDays = gap - 1;
      if (isGolden) {
        // نسخه‌ی طلایی: فریز نامحدود — استریک همیشه زنده می‌ماند
        frozen = true;
        s.current += 1;
      } else if (s.freezes >= missedDays) {
        s.freezes -= missedDays;
        s.freezesUsedTotal += missedDays;
        freezesConsumed = missedDays;
        frozen = true;
        s.current += 1;
      } else {
        // فریز ناکافی → شروع دوباره (پیام مهربان در UI، نه سرزنش)
        reset = true;
        s.current = 1;
      }
    }
  }

  s.lastPlayedPuzzleNumber = todayPuzzleNumber;
  if (s.current > s.best) s.best = s.current;

  // پس از reset، مایل‌استون از نو شمرده می‌شود تا دوباره انگیزه بسازد
  if (reset) s.lastFreezeEarnMilestone = 0;

  // هر ۷ روز استریک: فریز رایگان (سقف ۲) + موزاییک کامل
  let freezeEarned = false;
  let mosaicCompleted = false;
  const milestone = Math.floor(s.current / FREEZE_EARN_INTERVAL) * FREEZE_EARN_INTERVAL;
  if (milestone > 0 && milestone > s.lastFreezeEarnMilestone) {
    s.lastFreezeEarnMilestone = milestone;
    mosaicCompleted = true;
    s.mosaicsCompleted += 1;
    if (s.freezes < MAX_FREEZES) {
      s.freezes += 1;
      freezeEarned = true;
    }
  }

  return { state: s, changed: true, freezesConsumed, frozen, reset, freezeEarned, mosaicCompleted };
}

/**
 * وضعیت نمایشی استریک برای «امروز» — اگر کاربر امروز/دیروز بازی نکرده،
 * استریکِ نمایشی بدون دستکاریِ داده محاسبه می‌شود (فریزها فقط هنگام بازی
 * بعدی واقعاً مصرف می‌شوند — نمایش صادقانه اما امیدوارکننده).
 */
export function effectiveStreak(state: StreakState, todayPuzzleNumber: number, isGolden: boolean): number {
  const last = state.lastPlayedPuzzleNumber;
  if (last === null) return 0;
  const gap = todayPuzzleNumber - last;
  if (gap <= 1) return state.current; // امروز یا دیروز بازی کرده — زنده
  const missedDays = gap - 1;
  if (isGolden || state.freezes >= missedDays) return state.current; // با فریز زنده می‌ماند
  return 0;
}

/** پیشرفت موزاییک جاری: چند قطعه از ۷ قطعه چیده شده؟ */
export function mosaicProgress(current: number): { pieces: number; total: number } {
  return { pieces: current % MOSAIC_PIECES, total: MOSAIC_PIECES };
}
