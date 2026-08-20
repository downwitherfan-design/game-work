/**
 * «روز دُردانه» — روزهای جایزه‌دار شبه‌تصادفی با نرخ ~۱/۷.
 *
 * مبنای علمی: برنامه‌ی تقویت نسبیِ متغیر (Variable-Ratio Schedule) —
 * اعتیادآورترین زمان‌بندی پاداش (Ferster & Skinner, *Schedules of
 * Reinforcement*, 1957). اگر جایزه دقیقاً هر ۷ روز یک‌بار بود (نسبت ثابت)،
 * قابل پیش‌بینی و کم‌اثر می‌شد؛ درهم‌سازی شماره‌ی معما، الگو را از دید کاربر
 * غیرقابل پیش‌بینی می‌کند اما خروجی برای همه‌ی دستگاه‌ها **قطعی** می‌ماند
 * (الزام آفلاین-اول، خط قرمز #18).
 */
import { hashInt } from './rng';

/** نمک ثابت تا isDordanehDay با دیگر مصارف hashInt هم‌الگو نشود */
const DORDANEH_DAY_SALT = 0x0dd7;

/**
 * آیا معمای شماره‌ی n «روز دُردانه» (جایزه‌ی ویژه در UI) است؟
 * قطعی، آفلاین، نرخ حدوداً ۱ از ۷.
 */
export function isDordanehDay(puzzleNumber: number): boolean {
  return hashInt(puzzleNumber ^ (DORDANEH_DAY_SALT << 16)) % 7 === 0;
}
