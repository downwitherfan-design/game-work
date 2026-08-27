import { describe, expect, it } from 'vitest';
import { RATE_RULES, checkRateLimit } from '../src/rate-limit';
import { createTestDb } from './mini-d1';

const ANON = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('checkRateLimit', () => {
  it('allows up to the limit then blocks in the same window', async () => {
    const db = createTestDb();
    const rule = RATE_RULES['result']!;
    const now = 1_000_000_000_000;
    for (let i = 0; i < rule.limit; i++) {
      expect(await checkRateLimit(db, ANON, 'result', now)).toBe(true);
    }
    expect(await checkRateLimit(db, ANON, 'result', now)).toBe(false);
  });

  it('resets in a new window', async () => {
    const db = createTestDb();
    const rule = RATE_RULES['result']!;
    const now = 1_000_000_000_000;
    for (let i = 0; i < rule.limit + 2; i++) await checkRateLimit(db, ANON, 'result', now);
    expect(await checkRateLimit(db, ANON, 'result', now)).toBe(false);
    // پنجره‌ی بعد
    expect(await checkRateLimit(db, ANON, 'result', now + rule.windowMs)).toBe(true);
  });

  it('separates buckets per anonId and per endpoint', async () => {
    const db = createTestDb();
    const now = 1_000_000_000_000;
    const rule = RATE_RULES['circle_create']!;
    for (let i = 0; i < rule.limit; i++) await checkRateLimit(db, ANON, 'circle_create', now);
    expect(await checkRateLimit(db, ANON, 'circle_create', now)).toBe(false);
    // endpoint دیگر همان کاربر آزاد است
    expect(await checkRateLimit(db, ANON, 'duel_create', now)).toBe(true);
    // کاربر دیگر آزاد است
    const other = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
    expect(await checkRateLimit(db, other, 'circle_create', now)).toBe(true);
  });

  it('falls back to read rule for unknown endpoints', async () => {
    const db = createTestDb();
    expect(await checkRateLimit(db, ANON, 'unknown_endpoint', Date.now())).toBe(true);
  });
});
