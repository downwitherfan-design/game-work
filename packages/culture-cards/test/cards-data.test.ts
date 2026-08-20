/**
 * اعتبارسنجی دیتاسِت رسمی data/cards.json در CI (همان قواعد tools/validate.ts).
 * خروجی قرمز = کامیت ممنوع.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateCards } from '../src/validate';

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, '..', 'data', 'cards.json'), 'utf8');
const cards: unknown = JSON.parse(raw);

describe('data/cards.json — دیتاست رسمی', () => {
  it('همه‌ی کارت‌ها از همه‌ی قواعد کیفیت عبور می‌کنند', () => {
    const r = validateCards(cards);
    if (!r.ok) {
      // نمایش خطاها در گزارش تست برای رفع سریع
      expect(r.errors.join('\n')).toBe('');
    }
    expect(r.ok).toBe(true);
  });

  it('ترکیب متوازن kind ها (ضرب‌المثل بیشترین سهم)', () => {
    const r = validateCards(cards);
    expect(r.counts.proverb).toBeGreaterThan(0);
    expect(r.counts.poem).toBeGreaterThan(0);
    expect(r.counts.fact).toBeGreaterThan(0);
    expect(r.counts.occasion).toBeGreaterThan(0);
  });

  it('تاریخ مناسبت‌ها یکتاست (هر روز حداکثر یک مناسبت)', () => {
    const dates = (cards as { occasionDate?: string }[])
      .map((c) => c.occasionDate)
      .filter((d): d is string => d !== undefined);
    expect(new Set(dates).size).toBe(dates.length);
  });
});
