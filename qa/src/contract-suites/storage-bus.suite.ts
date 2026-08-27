/**
 * @dordaneh/qa — suite قرارداد StorageApi و EventBus (docs/02_CONTRACTS.md §5)
 */

import { describe, expect, it } from 'vitest';
import {
  puzzleStorageKey,
  STORAGE_KEYS,
  type AppEvent,
  type EventBus,
  type StorageApi,
} from '@dordaneh/contracts';

export interface StorageSuiteFixture {
  makeStorage: () => StorageApi;
}

export function runStorageContractSuite(name: string, fx: StorageSuiteFixture): void {
  describe(`StorageApi contract — ${name}`, () => {
    it('get روی کلید ناموجود null برمی‌گرداند (نه undefined، نه throw)', () => {
      const s = fx.makeStorage();
      expect(s.get('dor.nonexistent')).toBeNull();
    });

    it('set/get رفت‌وبرگشت انواع JSON را حفظ می‌کند (round-trip)', () => {
      const s = fx.makeStorage();
      const samples: [string, unknown][] = [
        [STORAGE_KEYS.streak, { value: 12, frozen: false }],
        [STORAGE_KEYS.stats, { played: 40, won: 33, dist: [1, 5, 9, 10, 6, 2] }],
        [puzzleStorageKey('daily-812'), { status: 'playing', guesses: [] }],
        [STORAGE_KEYS.settings, { theme: 'dark', sfx: true, locale: 'fa' }],
        ['dor.test.string', 'سلام دُردانه'],
        ['dor.test.number', 0],
        ['dor.test.bool', false],
        ['dor.test.null-in-obj', { a: null }],
      ];
      for (const [key, value] of samples) {
        s.set(key, value);
        expect(s.get(key), key).toEqual(value);
      }
    });

    it('بازنویسی کلید مقدار قبلی را جایگزین می‌کند', () => {
      const s = fx.makeStorage();
      s.set(STORAGE_KEYS.streak, { value: 1, frozen: false });
      s.set(STORAGE_KEYS.streak, { value: 2, frozen: true });
      expect(s.get(STORAGE_KEYS.streak)).toEqual({ value: 2, frozen: true });
    });

    it('متن فارسی با ZWNJ و ایموجی بدون خرابی ذخیره می‌شود', () => {
      const s = fx.makeStorage();
      const text = 'دُردانه\u200Cی من 🟩🟨⬜ — نیم‌فاصله حفظ شود';
      s.set('dor.test.fa', text);
      expect(s.get<string>('dor.test.fa')).toBe(text);
    });

    it('puzzleStorageKey از پیشوند رزروشده استفاده می‌کند', () => {
      expect(puzzleStorageKey('daily-812')).toBe('dor.puzzle.daily-812');
    });
  });
}

export interface EventBusSuiteFixture {
  makeBus: () => EventBus;
}

export function runEventBusContractSuite(name: string, fx: EventBusSuiteFixture): void {
  describe(`EventBus contract — ${name}`, () => {
    it('emit به listener همان type می‌رسد و payload دست‌نخورده است', () => {
      const bus = fx.makeBus();
      const got: AppEvent[] = [];
      bus.on('puzzle_finished', (e) => got.push(e));
      const ev: AppEvent = {
        type: 'puzzle_finished',
        puzzleId: 'daily-812',
        won: true,
        guessCount: 4,
        durationMs: 93_000,
      };
      bus.emit(ev);
      expect(got).toEqual([ev]);
    });

    it('listener نوعِ دیگر صدا زده نمی‌شود', () => {
      const bus = fx.makeBus();
      let called = 0;
      bus.on('share_completed', () => called++);
      bus.emit({ type: 'puzzle_started', puzzleId: 'daily-1', mode: 'daily' });
      expect(called).toBe(0);
    });

    it('unsubscribe واقعاً قطع می‌کند', () => {
      const bus = fx.makeBus();
      let called = 0;
      const off = bus.on('guess_submitted', () => called++);
      bus.emit({ type: 'guess_submitted', puzzleId: 'daily-1', guessIndex: 0 });
      off();
      bus.emit({ type: 'guess_submitted', puzzleId: 'daily-1', guessIndex: 1 });
      expect(called).toBe(1);
    });

    it('خطای یک listener بقیه را نمی‌شکند (fail-soft — اپ آفلاین-اول)', () => {
      const bus = fx.makeBus();
      let healthyCalled = false;
      bus.on('screen_viewed', () => {
        throw new Error('listener خراب');
      });
      bus.on('screen_viewed', () => {
        healthyCalled = true;
      });
      expect(() => bus.emit({ type: 'screen_viewed', screen: 'stats' })).not.toThrow();
      expect(healthyCalled).toBe(true);
    });

    it('چند listener روی یک type همگی صدا زده می‌شوند', () => {
      const bus = fx.makeBus();
      let a = 0;
      let b = 0;
      bus.on('streak_changed', () => a++);
      bus.on('streak_changed', () => b++);
      bus.emit({ type: 'streak_changed', value: 7, frozen: false });
      expect(a).toBe(1);
      expect(b).toBe(1);
    });
  });
}
