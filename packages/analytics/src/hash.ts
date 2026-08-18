/**
 * هش قطعی FNV-1a (32bit) — صفر وابستگی، برای بکتینگ A/B.
 * قطعی و پایدار: hash(anonId + ':' + experimentId) → همیشه همان variant.
 * FNV-1a توزیع یکنواخت خوبی برای کلیدهای کوتاه دارد (Fowler–Noll–Vo, 1991).
 */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // h *= 16777619 (mod 2^32) بدون سرریز float
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** بکتینگ قطعی ۵۰/۵۰ برای آزمایش A/B بدون سرور. */
export function bucketVariant(anonId: string, experimentId: string): 'A' | 'B' {
  return fnv1a32(`${anonId}:${experimentId}`) % 2 === 0 ? 'A' : 'B';
}

/** UUIDv4 با منبع تصادفی تزریق‌پذیر (بدون وابستگی به crypto — تست‌پذیر). */
export function uuidV4(random: () => number = Math.random): string {
  let out = '';
  for (const ch of 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx') {
    if (ch === 'x') out += ((random() * 16) | 0).toString(16);
    else if (ch === 'y') out += (((random() * 4) | 0) + 8).toString(16);
    else out += ch;
  }
  return out;
}
