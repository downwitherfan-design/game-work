/**
 * منبع شبه‌تصادف قطعی (deterministic PRNG) — تنها منبع «تصادف» موتور، seed ورودی است.
 *
 * mulberry32: PRNG کوچک، سریع و با توزیع مناسب برای مقاصد غیر-رمزنگارانه.
 * splitmix32-گونه برای درهم‌سازی seed های صحیح (avalanche خوب روی ورودی‌های متوالی).
 *
 * بدون Math.random، بدون Date — خروجی روی هر دستگاهی یکسان است.
 */

/** درهم‌سازی یک عدد صحیح ۳۲ بیتی با پخش بیت مناسب (avalanche) */
export function hashInt(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

/** ترکیب دو seed به یک seed واحد (برای seed + difficulty و غیره) */
export function combineSeeds(a: number, b: number): number {
  return hashInt((hashInt(a) ^ Math.imul(hashInt(b), 0x9e3779b9)) >>> 0);
}

/** سازنده‌ی PRNG قطعی mulberry32 — هر فراخوانی عددی در بازه‌ی [0, 1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
