/**
 * ساعت پیش‌فرض — همه‌ی محاسبات زمان از قرارداد (Asia/Tehran) می‌آید.
 * تزریق‌پذیر برای تست‌های مرز روز (تغییر puzzleNumber).
 */
import { puzzleNumberForDate } from '@dordaneh/contracts';
import type { Clock } from './types';

const hourFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tehran',
  hour: 'numeric',
  hour12: false,
});

/** ساعت تهرانِ یک لحظه — صادر شده برای تست */
export function tehranHourForDate(at: Date): number {
  const h = Number(hourFmt.format(at));
  return h === 24 ? 0 : h; // en-US hour12:false ممکن است 24 بدهد
}

export function createSystemClock(): Clock {
  return {
    now: () => Date.now(),
    puzzleNumber: () => puzzleNumberForDate(new Date()),
    tehranHour: () => tehranHourForDate(new Date()),
  };
}

/** ساعت قابل‌تنظیم برای تست‌های مرز روز */
export interface MutableClock extends Clock {
  setPuzzleNumber(n: number): void;
  setHour(h: number): void;
  setNow(ms: number): void;
}

/** ساعت ساختگی برای تست — روز و ساعت قابل تنظیم */
export function createFixedClock(
  puzzleNumber: number,
  hour = 12,
  nowMs = 1_700_000_000_000,
): MutableClock {
  const state = { puzzleNumber, hour, nowMs };
  return {
    now: () => state.nowMs,
    puzzleNumber: () => state.puzzleNumber,
    tehranHour: () => state.hour,
    setPuzzleNumber(n: number) {
      state.puzzleNumber = n;
    },
    setHour(h: number) {
      state.hour = h;
    },
    setNow(ms: number) {
      state.nowMs = ms;
    },
  };
}
