/**
 * Rate limiting ساده — پنجره‌ی ثابت per (anonId, endpoint) روی D1.
 * ضد اسپم لیدربورد؛ برای مقیاس MVP کافی است (بدون نیاز به KV).
 */

import type { D1Database } from './d1-types';

export interface RateLimitRule {
  /** حداکثر درخواست در هر پنجره */
  limit: number;
  /** طول پنجره (میلی‌ثانیه) */
  windowMs: number;
}

/** قواعد هر endpoint — سخت‌گیرتر برای نوشتن‌ها */
export const RATE_RULES: Readonly<Record<string, RateLimitRule>> = {
  result: { limit: 10, windowMs: 60_000 }, // POST /result
  circle_create: { limit: 5, windowMs: 3_600_000 }, // POST /circle
  circle_join: { limit: 20, windowMs: 3_600_000 }, // POST /circle/:id/join
  duel_create: { limit: 20, windowMs: 3_600_000 }, // POST /duel
  duel_result: { limit: 30, windowMs: 3_600_000 }, // POST /duel/:id/result
  read: { limit: 120, windowMs: 60_000 }, // GETهای عمومی
};

/**
 * true ⇦ مجاز؛ false ⇦ از حد گذشته (429).
 * پیاده‌سازی: شمارنده در ردیف با کلید `<anonId>:<endpoint>:<windowStart>`.
 * پاک‌سازی پنجره‌های کهنه به‌صورت فرصت‌طلبانه انجام می‌شود.
 */
export async function checkRateLimit(
  db: D1Database,
  anonId: string,
  endpoint: string,
  now: number,
): Promise<boolean> {
  const rule = RATE_RULES[endpoint] ?? RATE_RULES['read'];
  if (!rule) return true;
  const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
  const key = `${anonId}:${endpoint}:${windowStart}`;

  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket_key, hits, window_start) VALUES (?, 1, ?)
       ON CONFLICT (bucket_key) DO UPDATE SET hits = hits + 1
       RETURNING hits`,
    )
    .bind(key, windowStart)
    .first<{ hits: number }>();

  const hits = row?.hits ?? 1;

  // پاک‌سازی فرصت‌طلبانه: ~۲٪ درخواست‌ها ردیف‌های کهنه (> ۲ پنجره قبل) را حذف می‌کنند
  if (hits === 1 && windowStart % 50 === 0) {
    await db
      .prepare('DELETE FROM rate_limits WHERE window_start < ?')
      .bind(now - 2 * rule.windowMs)
      .run();
  }

  return hits <= rule.limit;
}
