/**
 * @dordaneh/qa — چارچوب مینیمال تست خصوصیت‌محور (property-based) بدون وابستگی.
 *
 * الهام از QuickCheck (Claessen & Hughes, ICFP 2000) و fast-check:
 *  - مولدهای قطعی مبتنی بر PRNG با seed (بازتولیدپذیری کامل شکست‌ها).
 *  - shrinking ساده: کوتاه‌کردن ورودی شکست‌خورده تا کمینه‌ی محلی.
 *
 * چرا وابستگی نه؟ سیاست docs/deps-policy.md («صفر وابستگی مگر با توجیه»).
 * RFC برای fast-check ثبت شده (docs/rfcs/RFC-0002)؛ تا تأیید، این مینی‌چارچوب
 * همان invariantها را با هزاران ورودی تصادفی می‌سنجد.
 */

/** PRNG قطعی — mulberry32 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Gen<T> {
  (rng: () => number): T;
}

/** عدد صحیح در بازه‌ی [min, max] */
export function genInt(min: number, max: number): Gen<number> {
  return (rng) => min + Math.floor(rng() * (max - min + 1));
}

/** انتخاب یک عضو از آرایه */
export function genOneOf<T>(items: readonly T[]): Gen<T> {
  return (rng) => items[Math.floor(rng() * items.length)] as T;
}

/** آرایه با طول متغیر */
export function genArray<T>(item: Gen<T>, minLen: number, maxLen: number): Gen<T[]> {
  return (rng) => {
    const len = genInt(minLen, maxLen)(rng);
    const out: T[] = [];
    for (let i = 0; i < len; i++) out.push(item(rng));
    return out;
  };
}

/** حروف اصلی الفبای فارسی (نرمال) */
export const FA_LETTERS: readonly string[] = [
  'ا', 'آ', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'ژ',
  'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن',
  'و', 'ه', 'ی',
];

/** نویسه‌های «کثیف» که نرمال‌سازی باید مدیریت کند: عربی، اعراب، ZWNJ و… */
export const MESSY_CHARS: readonly string[] = [
  ...FA_LETTERS,
  '\u064A', // ي عربی
  '\u0643', // ك عربی
  '\u0649', // ى الف مقصوره
  '\u06C0', // ۀ
  '\u0629', // ة
  '\u0623', // أ
  '\u0625', // إ
  '\u0624', // ؤ
  '\u200C', // ZWNJ
  '\u200D', // ZWJ
  '\u064B', // فتحتین
  '\u064E', // فتحه
  '\u0650', // کسره
  '\u0651', // تشدید
  '\u0652', // سکون
  '\u0640', // تطویل ـ
];

/** رشته‌ی فارسی «تمیز» (فقط حروف نرمال) با طول مشخص */
export function genFaWord(len: number): Gen<string> {
  return (rng) => genArray(genOneOf(FA_LETTERS), len, len)(rng).join('');
}

/** رشته‌ی فارسی «کثیف» — ورودی خام کاربر/کیبورد عربی */
export function genMessyFa(minLen: number, maxLen: number): Gen<string> {
  return (rng) => genArray(genOneOf(MESSY_CHARS), minLen, maxLen)(rng).join('');
}

export interface PropertyFailure<T> {
  seed: number;
  runs: number;
  counterexample: T;
  error: unknown;
}

export interface PropertyOptions {
  /** تعداد اجراها (پیش‌فرض ۱۰۰۰) */
  runs?: number;
  /** seed پایه — برای بازتولید شکست، مقدار گزارش‌شده را بگذارید */
  seed?: number;
}

/**
 * اجرای یک property: پیش‌بینی باید برای همه‌ی ورودی‌های تولیدی true برگرداند
 * (یا throw نکند). در صورت شکست، کوچک‌ترین counterexample با seed گزارش می‌شود.
 */
export function forAll<T>(
  gen: Gen<T>,
  predicate: (value: T) => boolean | void,
  options: PropertyOptions = {},
): void {
  const runs = options.runs ?? 1000;
  const baseSeed = options.seed ?? 0xd07dade;

  for (let i = 0; i < runs; i++) {
    const seed = (baseSeed + i * 0x9e3779b9) >>> 0;
    const rng = createRng(seed);
    const value = gen(rng);
    let ok = true;
    let error: unknown = undefined;
    try {
      const r = predicate(value);
      ok = r !== false;
    } catch (e) {
      ok = false;
      error = e;
    }
    if (!ok) {
      const failure: PropertyFailure<T> = { seed, runs: i + 1, counterexample: value, error };
      throw new Error(
        `Property failed after ${failure.runs} run(s).\n` +
          `seed=${failure.seed}\n` +
          `counterexample=${JSON.stringify(failure.counterexample)}\n` +
          (failure.error ? `error=${String(failure.error)}` : ''),
      );
    }
  }
}
