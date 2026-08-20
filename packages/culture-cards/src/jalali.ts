/**
 * @dordaneh/culture-cards — تبدیل شماره‌ی معما به تاریخ شمسی «MM-DD».
 *
 * قطعی (deterministic) و آفلاین: به‌جای ساعت دستگاه، از خودِ puzzleNumber
 * استفاده می‌کنیم. طبق docs/02_CONTRACTS.md §0: معمای شماره‌ی ۱ = روز
 * 2026-09-01 در Asia/Tehran. پس تاریخ شمسیِ معمای n همیشه و همه‌جا یکسان است.
 *
 * از epoch رسمی قرارداد (PUZZLE_EPOCH) می‌خوانیم — هرگز خودمان تاریخ مبنا
 * را هاردکد نمی‌کنیم (خط قرمز ۲۱: محاسبات مشترک فقط از contracts).
 */
import { PUZZLE_EPOCH } from '@dordaneh/contracts';

const MS_PER_DAY = 86_400_000;

/** فرمت‌کننده‌ی تقویم شمسی (persian) — بومی مرورگر/Node، بدون وابستگی. */
const jalaliFmt = new Intl.DateTimeFormat('en-u-ca-persian', {
  timeZone: 'UTC',
  month: '2-digit',
  day: '2-digit',
});

function epochUtcMidnight(): number {
  const [y, m, d] = PUZZLE_EPOCH.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/**
 * تاریخ شمسی معمای شماره‌ی n به شکل 'MM-DD' (مثلاً '09-30' = ۳۰ آذر، شب یلدا).
 * برای n های نامعتبر (صفر/منفی/ناعدد) به معمای ۱ سقوط می‌کند.
 */
export function shamsiMMDDForPuzzle(puzzleNumber: number): string {
  const n = Number.isFinite(puzzleNumber) && puzzleNumber >= 1 ? Math.floor(puzzleNumber) : 1;
  const at = new Date(epochUtcMidnight() + (n - 1) * MS_PER_DAY);
  const parts = jalaliFmt.formatToParts(at);
  let mm = '01';
  let dd = '01';
  for (const p of parts) {
    if (p.type === 'month') mm = p.value;
    if (p.type === 'day') dd = p.value;
  }
  return `${mm}-${dd}`;
}
