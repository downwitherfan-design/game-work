/**
 * تست صریح ضد-PII — خط قرمز ۲۸ و DoD پرامپت AI-12:
 * «payload هیچ فیلد شخصی ندارد».
 */
import { describe, expect, it } from 'vitest';
import { createMemoryStorage, STORAGE_KEYS } from '@dordaneh/contracts';
import type { AppEvent } from '@dordaneh/contracts';
import { createAnalytics } from '../src/analytics';
import { isPiiFieldName, looksLikePiiValue, sanitizePayload } from '../src/privacy';
import type { TransportAdapter, WireEvent } from '../src/types';

const PII_KEYS = [
  'email',
  'userEmail',
  'phone',
  'phoneNumber',
  'mobile',
  'contactList',
  'address',
  'firstName',
  'lastName',
  'fullName',
  'birthDate',
  'password',
  'authToken',
  'apiSecret',
  'nationalId',
  'ip',
  'ipAddress',
  'latitude',
  'longitude',
  'geoHash',
];

describe('گارد ضد-PII (خط قرمز ۲۸)', () => {
  it('همه‌ی نام‌فیلدهای شخصی شناخته می‌شوند', () => {
    for (const k of PII_KEYS) {
      expect(isPiiFieldName(k), `field: ${k}`).toBe(true);
    }
  });

  it('فیلدهای مجاز بازی PII نیستند', () => {
    for (const k of ['puzzleId', 'guessCount', 'durationMs', 'won', 'screen', 'sku', 'surface']) {
      expect(isPiiFieldName(k), `field: ${k}`).toBe(false);
    }
  });

  it('مقادیر شبیه ایمیل/موبایل ایران شناسایی می‌شوند', () => {
    expect(looksLikePiiValue('ali@example.com')).toBe(true);
    expect(looksLikePiiValue('09123456789')).toBe(true);
    expect(looksLikePiiValue('+989123456789')).toBe(true);
    expect(looksLikePiiValue('0912 345 6789')).toBe(true);
    expect(looksLikePiiValue('daily-812')).toBe(false);
    expect(looksLikePiiValue(42)).toBe(false);
  });

  it('sanitizePayload فیلدهای PII را حذف و مقادیر مشکوک را redact می‌کند', () => {
    const out = sanitizePayload({
      type: 'x',
      puzzleId: 'daily-812',
      email: 'a@b.com',
      note: 'call me at 09121234567',
      nested: { phone: '0912', screen: 'home' },
      arr: [1, 'ok', 'x@y.io', { obj: 'dropped' }],
      fn: () => 0,
      long: 'x'.repeat(200),
    });
    expect(out).not.toHaveProperty('type');
    expect(out).not.toHaveProperty('email');
    expect(out).not.toHaveProperty('fn');
    expect(out['note']).toBe('[redacted]');
    expect(out['puzzleId']).toBe('daily-812');
    expect((out['nested'] as Record<string, unknown>)['screen']).toBe('home');
    expect(out['nested']).not.toHaveProperty('phone');
    expect(out['arr']).toEqual([1, 'ok']);
    expect((out['long'] as string).length).toBe(120);
  });

  it('DoD: هیچ رکورد صف‌شده‌ای فیلد شخصی ندارد — حتی با ورودی آلوده', () => {
    const storage = createMemoryStorage();
    const adapter: TransportAdapter = { name: 't', send: () => false }; // در صف بماند
    const a = createAnalytics({
      storage,
      adapter,
      appVersion: '1',
      platform: 'test',
      locale: 'fa-IR',
      flushIntervalMs: 0,
      doc: null,
      batchSize: 1000,
    });

    // همه‌ی رویدادهای قرارداد + یک رویداد عمداً آلوده به PII
    const events: AppEvent[] = [
      { type: 'puzzle_started', puzzleId: 'daily-1', mode: 'daily' },
      { type: 'guess_submitted', puzzleId: 'daily-1', guessIndex: 0 },
      { type: 'puzzle_finished', puzzleId: 'daily-1', won: true, guessCount: 3, durationMs: 42_000 },
      { type: 'card_revealed', cardId: 'c1' },
      { type: 'share_initiated', surface: 'result' },
      { type: 'share_completed', surface: 'result' },
      { type: 'streak_changed', value: 5, frozen: false },
      { type: 'reward_ad_requested', placement: 'hint' },
      { type: 'reward_ad_completed', placement: 'hint' },
      { type: 'purchase_completed', sku: 'golden' },
      { type: 'screen_viewed', screen: 'stats' },
    ];
    for (const e of events) a.track(e);
    // رویداد آلوده (تایپ ژنریک از مرز runtime — شبیه باگ آینده)
    a.track({
      type: 'screen_viewed',
      screen: 'home',
      email: 'leak@example.com',
      phoneNumber: '09121234567',
    } as unknown as AppEvent);

    const q = storage.get<WireEvent[]>(STORAGE_KEYS.analyticsQueue)!;
    expect(q.length).toBe(events.length + 1);

    const forbidden = /email|phone|mobile|contact|address|firstname|lastname|fullname|birth|password|token|secret|nationalid|"ip"|latitude|longitude/i;
    for (const rec of q) {
      const json = JSON.stringify(rec.payload);
      expect(json, `payload آلوده: ${json}`).not.toMatch(forbidden);
      expect(json).not.toContain('leak@example.com');
      expect(json).not.toContain('09121234567');
      // متادیتا فقط کلیدهای ناشناس مجاز را دارد
      expect(Object.keys(rec.meta).sort()).toEqual(
        ['anonId', 'appVersion', 'installWeek', 'locale', 'platform', 'seq', 'sessionId'].sort(),
      );
    }
    a.dispose();
  });
});
