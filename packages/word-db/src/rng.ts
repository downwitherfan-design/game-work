/**
 * PRNG قطعی mulberry32 — پیاده‌سازی داخلی، صفر وابستگی.
 * برای انتخاب قطعی کلمه‌ی تمرین از seed (آفلاین-اول، خط قرمز #18).
 */
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

/** عدد صحیح قطعی در بازه‌ی [0, max) از یک seed */
export function seededIndex(seed: number, max: number): number {
  if (max <= 0) return 0;
  return Math.floor(mulberry32(seed)() * max);
}
