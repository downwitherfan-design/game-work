/**
 * «روز دُردانه» — معمای جایزه‌دارِ شبه‌تصادفیِ قطعی (~هفته‌ای یک‌بار).
 * جایزه: کارت فرهنگی legendary (قاب طلایی) تضمینی.
 *
 * مبنا: پاداش متغیر — برنامه‌ی نسبی متغیر، اعتیادآورترین زمان‌بندی پاداش
 * (Ferster & Skinner, Schedules of Reinforcement, 1957).
 *
 * ⚠️ قاعده‌ی طراحی: اعلام فقط «بعد از حل» — پیش‌آگهی، غافلگیری (قله‌ی تجربه،
 * Kahneman Peak-End 1993) را می‌کُشد و FOMO ناسالم می‌سازد.
 *
 * قطعی و آفلاین: تابع hash از puzzleNumber — همه‌ی کاربران یک روزِ مشترک را
 * جایزه‌دار می‌بینند (هم‌رسانی اجتماعی: «امروز روز دُردانه بود!»).
 */

/** احتمال تقریبی: ۱ از ۷ روز (شبه‌تصادفی قطعی) */
const DORDANEH_MOD = 7;

/**
 * xorshift-مانند ساده و قطعی روی عدد صحیح — بدون وابستگی.
 * (کیفیت آماری برای «حس تصادف» کافی است؛ نیاز رمزنگارانه نداریم.)
 */
export function hashPuzzleNumber(n: number): number {
  let x = (n | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

/** آیا این معمای روزانه «روز دُردانه» است؟ (قطعی، آفلاین، مشترک بین همه) */
export function isDordanehDay(puzzleNumber: number): boolean {
  if (!Number.isFinite(puzzleNumber) || puzzleNumber < 1) return false;
  return hashPuzzleNumber(Math.floor(puzzleNumber)) % DORDANEH_MOD === 0;
}
