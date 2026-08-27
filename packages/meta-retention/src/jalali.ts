/**
 * تقویم شمسی برای StatsScreen — بدون هیچ وابستگی (deps-policy):
 * از Intl با تقویم persian استفاده می‌کند که در همه‌ی WebViewهای مدرن هست.
 * نگاشت puzzleNumber ↔ تاریخ از epoch قرارداد (2026-09-01، تهران) انجام می‌شود.
 */
import { PUZZLE_EPOCH, PUZZLE_TIMEZONE } from '@dordaneh/contracts';

const MS_PER_DAY = 86_400_000;

/** لحظه‌ی ظهر UTC روزِ یک puzzleNumber — ظهر برای مصونیت از خطای مرز روز */
export function dateForPuzzleNumber(puzzleNumber: number): Date {
  const [y, m, d] = PUZZLE_EPOCH.split('-').map(Number) as [number, number, number];
  const epochNoonUtc = Date.UTC(y, m - 1, d, 12);
  return new Date(epochNoonUtc + (puzzleNumber - 1) * MS_PER_DAY);
}

const partsFmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  timeZone: PUZZLE_TIMEZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export interface JalaliDate {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
}

/** تاریخ شمسیِ روز یک puzzleNumber */
export function jalaliForPuzzleNumber(puzzleNumber: number): JalaliDate {
  const parts = partsFmt.formatToParts(dateForPuzzleNumber(puzzleNumber));
  const get = (t: string): number =>
    Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { jy: get('year'), jm: get('month'), jd: get('day') };
}

/** نام ماه‌های شمسی — داده‌ی تقویمی است نه متن UI؛ نمایش نهایی از locale می‌آید */
export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** طول ماه شمسی (کبیسه را با کاوش Intl تشخیص می‌دهد — بدون الگوریتم محلی) */
export function jalaliMonthLength(jy: number, jm: number, anchorPuzzleNumber: number): number {
  // از روز anchor به عقب/جلو می‌رویم تا آخرین روز ماه را بیابیم.
  // ماه‌های ۱..۶ = ۳۱ روز؛ ۷..۱۱ = ۳۰؛ اسفند = ۲۹/۳۰ (کبیسه).
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // اسفند: بررسی کن روز ۳۰ در همان ماه می‌ماند؟
  const probe = jalaliForPuzzleNumber(anchorPuzzleNumber);
  // از anchor روز به روز جلو برو تا از اسفند خارج شویم (حداکثر ۳۱ گام)
  let n = anchorPuzzleNumber + (30 - probe.jd);
  const at30 = jalaliForPuzzleNumber(n);
  if (at30.jm === 12 && at30.jd === 30 && at30.jy === jy) return 30;
  // ممکن است anchor دقیقاً روز ۳۰ نباشد — جستجوی کوتاه
  for (let i = -1; i <= 1; i++) {
    const d = jalaliForPuzzleNumber(n + i);
    if (d.jy === jy && d.jm === 12 && d.jd === 30) return 30;
  }
  return 29;
}

export interface CalendarCell {
  /** روز ماه شمسی (۱..۳۱) */
  jd: number;
  puzzleNumber: number;
  played: boolean;
  isToday: boolean;
}

export interface MonthCalendar {
  jy: number;
  jm: number;
  monthName: string;
  /** ایندکس ستون شروع (۰=شنبه) برای چینش گرید هفتگی */
  startWeekday: number;
  cells: CalendarCell[];
}

const weekdayFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: PUZZLE_TIMEZONE,
  weekday: 'short',
});

/** ۰=شنبه … ۶=جمعه (هفته‌ی ایرانی) */
export function iranWeekday(puzzleNumber: number): number {
  const wd = weekdayFmt.format(dateForPuzzleNumber(puzzleNumber));
  const map: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
  return map[wd] ?? 0;
}

/**
 * تقویم ماه شمسیِ جاری (ماهِ todayPuzzleNumber) با روزهای بازی‌شده.
 * @param offsetMonths ۰ = ماه جاری، -۱ = ماه قبل …
 */
export function buildMonthCalendar(
  todayPuzzleNumber: number,
  playedPuzzles: readonly number[],
  offsetMonths = 0,
): MonthCalendar {
  // به اول ماهِ هدف برو
  let anchor = todayPuzzleNumber;
  let j = jalaliForPuzzleNumber(anchor);
  anchor -= j.jd - 1; // اول ماه جاری
  for (let k = 0; k < Math.abs(offsetMonths); k++) {
    if (offsetMonths < 0) {
      anchor -= 1; // آخرین روز ماه قبل
      const prev = jalaliForPuzzleNumber(anchor);
      anchor -= prev.jd - 1; // اول ماه قبل
    } else {
      const cur = jalaliForPuzzleNumber(anchor);
      anchor += jalaliMonthLength(cur.jy, cur.jm, anchor); // اول ماه بعد
    }
  }
  j = jalaliForPuzzleNumber(anchor);
  const len = jalaliMonthLength(j.jy, j.jm, anchor);
  const played = new Set(playedPuzzles);
  const cells: CalendarCell[] = [];
  for (let d = 0; d < len; d++) {
    const pn = anchor + d;
    cells.push({
      jd: d + 1,
      puzzleNumber: pn,
      played: played.has(pn),
      isToday: pn === todayPuzzleNumber,
    });
  }
  return {
    jy: j.jy,
    jm: j.jm,
    monthName: JALALI_MONTHS[j.jm - 1] ?? '',
    startWeekday: iranWeekday(anchor),
    cells,
  };
}
