import { describe, it, expect } from 'vitest';
import { puzzleNumberForDate } from '@dordaneh/contracts';
import {
  dateForPuzzleNumber,
  jalaliForPuzzleNumber,
  jalaliMonthLength,
  iranWeekday,
  buildMonthCalendar,
  JALALI_MONTHS,
} from '../src/jalali';

describe('dateForPuzzleNumber', () => {
  it('روز ۱ = همان روز epoch (2026-09-01)', () => {
    const d = dateForPuzzleNumber(1);
    expect(d.toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it('رفت‌وبرگشت با puzzleNumberForDate قرارداد سازگار است', () => {
    for (const n of [1, 22, 23, 100, 200, 365, 366, 500]) {
      expect(puzzleNumberForDate(dateForPuzzleNumber(n))).toBe(n);
    }
  });
});

describe('jalaliForPuzzleNumber', () => {
  it('روز ۱ = ۱۰ شهریور ۱۴۰۵', () => {
    expect(jalaliForPuzzleNumber(1)).toEqual({ jy: 1405, jm: 6, jd: 10 });
  });

  it('مرز ماه: روز ۲۲ = ۳۱ شهریور، روز ۲۳ = ۱ مهر', () => {
    expect(jalaliForPuzzleNumber(22)).toEqual({ jy: 1405, jm: 6, jd: 31 });
    expect(jalaliForPuzzleNumber(23)).toEqual({ jy: 1405, jm: 7, jd: 1 });
  });

  it('روزهای متوالی، تاریخ‌های متوالی می‌دهند (بدون پرش/تکرار در ۴۰۰ روز)', () => {
    let prev = jalaliForPuzzleNumber(1);
    for (let n = 2; n <= 400; n++) {
      const cur = jalaliForPuzzleNumber(n);
      const sameMonth = cur.jy === prev.jy && cur.jm === prev.jm;
      if (sameMonth) {
        expect(cur.jd).toBe(prev.jd + 1);
      } else {
        expect(cur.jd).toBe(1);
      }
      prev = cur;
    }
  });
});

describe('jalaliMonthLength', () => {
  it('ماه‌های ۱..۶ = ۳۱ روز', () => {
    expect(jalaliMonthLength(1405, 1, 1)).toBe(31);
    expect(jalaliMonthLength(1405, 6, 1)).toBe(31);
  });

  it('ماه‌های ۷..۱۱ = ۳۰ روز', () => {
    expect(jalaliMonthLength(1405, 7, 23)).toBe(30);
    expect(jalaliMonthLength(1405, 11, 23)).toBe(30);
  });

  it('اسفند با کاوش Intl تعیین می‌شود (۲۹ یا ۳۰) و با شمارش واقعی روزها می‌خواند', () => {
    // اول اسفند ۱۴۰۵ را پیدا کن
    let n = 1;
    let j = jalaliForPuzzleNumber(n);
    while (!(j.jm === 12 && j.jd === 1)) {
      n++;
      j = jalaliForPuzzleNumber(n);
    }
    const len = jalaliMonthLength(j.jy, 12, n);
    expect([29, 30]).toContain(len);
    // شمارش واقعی: آخرین روزی که هنوز اسفند همان سال است
    let count = 0;
    while (true) {
      const d = jalaliForPuzzleNumber(n + count);
      if (d.jm !== 12 || d.jy !== j.jy) break;
      count++;
    }
    expect(len).toBe(count);
  });
});

describe('iranWeekday', () => {
  it('۷ روز متوالی همه‌ی ایندکس‌های ۰..۶ را می‌پوشانند و مقدارها چرخه‌ای‌اند', () => {
    const seen = new Set<number>();
    const first = iranWeekday(1);
    for (let i = 0; i < 7; i++) {
      const w = iranWeekday(1 + i);
      expect(w).toBe((first + i) % 7);
      seen.add(w);
    }
    expect(seen.size).toBe(7);
  });

  it('2026-09-01 سه‌شنبه است → ایندکس ایرانی ۳', () => {
    expect(iranWeekday(1)).toBe(3);
  });
});

describe('buildMonthCalendar', () => {
  it('ماه جاری روز ۱ (شهریور ۱۴۰۵): ۳۱ سلول، today و played درست', () => {
    const cal = buildMonthCalendar(5, [1, 3, 5], 0);
    expect(cal.jy).toBe(1405);
    expect(cal.jm).toBe(6);
    expect(cal.monthName).toBe(JALALI_MONTHS[5]);
    expect(cal.cells).toHaveLength(31);
    // اول شهریور = puzzleNumber = 5 - (14-1)؟ نه: روز ۵ = ۱۴ شهریور → اول ماه = 5-13 = -8
    const first = cal.cells[0]!;
    expect(first.jd).toBe(1);
    expect(jalaliForPuzzleNumber(first.puzzleNumber).jd).toBe(1);
    const today = cal.cells.find((c) => c.isToday);
    expect(today?.puzzleNumber).toBe(5);
    expect(cal.cells.filter((c) => c.played).map((c) => c.puzzleNumber)).toEqual([1, 3, 5]);
  });

  it('offsetMonths=-1 ماه قبل را می‌دهد (مرداد ۱۴۰۵) بدون سلول today', () => {
    const cal = buildMonthCalendar(5, [], -1);
    expect(cal.jm).toBe(5);
    expect(cal.jy).toBe(1405);
    expect(cal.cells).toHaveLength(31);
    expect(cal.cells.some((c) => c.isToday)).toBe(false);
  });

  it('offsetMonths=+1 ماه بعد را می‌دهد (مهر ۱۴۰۵ با ۳۰ روز)', () => {
    const cal = buildMonthCalendar(5, [], 1);
    expect(cal.jm).toBe(7);
    expect(cal.cells).toHaveLength(30);
  });

  it('عبور از مرز سال با offset منفی (از فروردین به اسفند سال قبل)', () => {
    // روزی در فروردین ۱۴۰۶ را پیدا کن
    let n = 1;
    while (jalaliForPuzzleNumber(n).jy !== 1406) n++;
    const cal = buildMonthCalendar(n, [], -1);
    expect(cal.jy).toBe(1405);
    expect(cal.jm).toBe(12);
    expect([29, 30]).toContain(cal.cells.length);
  });

  it('startWeekday با iranWeekday اول ماه یکی است', () => {
    const cal = buildMonthCalendar(40, [], 0);
    expect(cal.startWeekday).toBe(iranWeekday(cal.cells[0]!.puzzleNumber));
    expect(cal.startWeekday).toBeGreaterThanOrEqual(0);
    expect(cal.startWeekday).toBeLessThanOrEqual(6);
  });
});
