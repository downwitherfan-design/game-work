/**
 * @dordaneh/qa — suite قرارداد Analytics (بدون PII) / Audio / Monetization (mock=rewarded)
 * (docs/02_CONTRACTS.md §8 §9 §10 + خطوط قرمز ۱۲، ۱۳، ۲۸)
 */

import { describe, expect, it } from 'vitest';
import type {
  AnalyticsApi,
  AppEvent,
  AudioApi,
  MonetizationApi,
  SfxName,
} from '@dordaneh/contracts';

// ---------------------------------------------------------------------------
// Analytics — اسکن PII روی payload (خط قرمز ۲۸: هیچ داده‌ی شخصی)
// ---------------------------------------------------------------------------

export interface AnalyticsSuiteFixture {
  makeAnalytics: () => AnalyticsApi;
  /** payload صف‌شده را بیرون بده (mock مرجع دارد؛ برای پیاده‌سازی واقعی، آداپتور تست) */
  drainQueue?: (api: AnalyticsApi) => readonly AppEvent[];
}

/** الگوهای PII که هرگز نباید در payload آنالیتیکس باشند */
const PII_PATTERNS: readonly { name: string; re: RegExp }[] = [
  { name: 'ایمیل', re: /[\w.+-]+@[\w-]+\.[\w.]+/u },
  { name: 'موبایل ایران', re: /(?:\+98|0098|0)9\d{9}/ },
  { name: 'کد ملی (۱۰ رقم پشت‌سرهم)', re: /(?<!\d)\d{10}(?!\d)/ },
  { name: 'شماره کارت', re: /(?<!\d)\d{16}(?!\d)/ },
];

export function scanForPii(payload: unknown): string[] {
  const json = JSON.stringify(payload) ?? '';
  const hits: string[] = [];
  for (const { name, re } of PII_PATTERNS) {
    if (re.test(json)) hits.push(name);
  }
  return hits;
}

export function runAnalyticsContractSuite(name: string, fx: AnalyticsSuiteFixture): void {
  describe(`AnalyticsApi contract — ${name}`, () => {
    const events: AppEvent[] = [
      { type: 'puzzle_started', puzzleId: 'daily-812', mode: 'daily' },
      { type: 'guess_submitted', puzzleId: 'daily-812', guessIndex: 2 },
      { type: 'puzzle_finished', puzzleId: 'daily-812', won: true, guessCount: 4, durationMs: 90_000 },
      { type: 'card_revealed', cardId: 'card-0001' },
      { type: 'share_completed', surface: 'result' },
      { type: 'screen_viewed', screen: 'stats' },
    ];

    it('track هرگز throw نمی‌کند (fail-soft)', () => {
      const a = fx.makeAnalytics();
      for (const e of events) expect(() => a.track(e)).not.toThrow();
    });

    it('هیچ PII در payload صف‌شده نیست (ایمیل/موبایل/کدملی/کارت)', () => {
      const a = fx.makeAnalytics();
      for (const e of events) a.track(e);
      const queued = fx.drainQueue ? fx.drainQueue(a) : events;
      for (const e of queued) {
        expect(scanForPii(e), `PII در ${e.type}`).toEqual([]);
      }
    });

    it('اسکنر PII خودش کار می‌کند (self-test روی نمونه‌ی آلوده)', () => {
      expect(scanForPii({ email: 'x@y.com' })).toContain('ایمیل');
      expect(scanForPii({ tel: '09123456789' })).toContain('موبایل ایران');
      expect(scanForPii({ type: 'screen_viewed', screen: 'stats' })).toEqual([]);
    });

    it('getRemoteConfig روی کلید ناموجود fallback برمی‌گرداند', () => {
      const a = fx.makeAnalytics();
      expect(a.getRemoteConfig('qa.nonexistent', 42)).toBe(42);
      expect(a.getRemoteConfig('qa.nonexistent.str', 'x')).toBe('x');
    });
  });
}

// ---------------------------------------------------------------------------
// Audio — هرگز throw نکند؛ toggleها اثر داشته باشند.
// ---------------------------------------------------------------------------

export interface AudioSuiteFixture {
  makeAudio: () => AudioApi;
}

const ALL_SFX: readonly SfxName[] = [
  'tap', 'flip', 'correct', 'present', 'absent', 'win', 'lose', 'streak', 'card_reveal', 'confetti',
];

export function runAudioContractSuite(name: string, fx: AudioSuiteFixture): void {
  describe(`AudioApi contract — ${name}`, () => {
    it('play برای همه‌ی SfxNameها throw نمی‌کند (صدا هرگز بازی را نمی‌شکند)', () => {
      const audio = fx.makeAudio();
      for (const sfx of ALL_SFX) expect(() => audio.play(sfx), sfx).not.toThrow();
    });

    it('haptic برای همه‌ی انواع throw نمی‌کند', () => {
      const audio = fx.makeAudio();
      for (const kind of ['light', 'medium', 'success', 'error'] as const) {
        expect(() => audio.haptic(kind), kind).not.toThrow();
      }
    });

    it('setMusicEnabled/setSfxEnabled بدون خطا قابل toggle هستند', () => {
      const audio = fx.makeAudio();
      expect(() => {
        audio.setMusicEnabled(false);
        audio.setMusicEnabled(true);
        audio.setSfxEnabled(false);
        audio.setSfxEnabled(true);
      }).not.toThrow();
    });
  });
}

// ---------------------------------------------------------------------------
// Monetization — mock وب/دِو باید همیشه 'rewarded'/'ok' بدهد (§10).
// ---------------------------------------------------------------------------

export interface MonetizationSuiteFixture {
  makeMonetization: () => MonetizationApi;
  /** آیا این پیاده‌سازی همان mock وب/دِو است؟ (روی آداپتور واقعی تپسل false) */
  isDevMock: boolean;
}

export function runMonetizationContractSuite(name: string, fx: MonetizationSuiteFixture): void {
  describe(`MonetizationApi contract — ${name}`, () => {
    it('کاربر تازه: isGolden=false و هیچ SKUیی owned نیست (هرگز pay-to-win پیش‌فرض)', () => {
      const m = fx.makeMonetization();
      expect(m.isGolden()).toBe(false);
      for (const sku of ['golden', 'pack_cooking', 'pack_cinema', 'pack_sport', 'pack_classic', 'theme_pack_1'] as const) {
        expect(m.ownsSku(sku), sku).toBe(false);
      }
    });

    it('showRewardedAd نتیجه‌ی مجاز برمی‌گرداند و هرگز reject نمی‌شود', async () => {
      const m = fx.makeMonetization();
      for (const placement of ['extra_guess', 'hint'] as const) {
        const r = await m.showRewardedAd(placement);
        expect(['rewarded', 'skipped', 'unavailable']).toContain(r);
        if (fx.isDevMock) expect(r).toBe('rewarded'); // §10: mock همیشه rewarded
      }
    });

    it('purchase در mock دِو "ok" است و پس از خرید ownsSku=true', async () => {
      const m = fx.makeMonetization();
      const r = await m.purchase('golden');
      expect(['ok', 'cancelled', 'error']).toContain(r);
      if (fx.isDevMock) {
        expect(r).toBe('ok');
        expect(m.isGolden()).toBe(true);
        expect(m.ownsSku('golden')).toBe(true);
      }
    });
  });
}
