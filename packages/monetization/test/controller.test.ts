/**
 * تست کنترلر MonetizationApi — جریان کامل تبلیغ جایزه‌ای و خرید.
 */

import { describe, it, expect, vi } from 'vitest';
import type { AppEvent } from '@dordaneh/contracts';
import { createMonetization } from '../src/controller';
import { createMockAdProvider, createMockIapProvider } from '../src/providers/mock';
import { verifyReceipt, readIapState } from '../src/iap-state';
import { makeStorage, makeBus, completeOnboarding } from './helpers';

const NOW = Date.UTC(2026, 8, 10, 12, 0, 0);

function setup(opts?: {
  firstSession?: boolean;
  consent?: boolean | ((p: string) => Promise<boolean>);
  adShow?: () => Promise<'rewarded' | 'skipped' | 'unavailable'>;
  adReady?: () => Promise<boolean>;
}) {
  const storage = makeStorage();
  const bus = makeBus();
  if (!opts?.firstSession) completeOnboarding(storage);
  const events: AppEvent[] = [];
  bus.on('reward_ad_completed', (e) => events.push(e));
  bus.on('purchase_completed', (e) => events.push(e));
  const consent = opts?.consent ?? true;
  const mon = createMonetization({
    storage,
    bus,
    adProvider: createMockAdProvider({
      show: opts?.adShow,
      isReady: opts?.adReady,
    }),
    iapProvider: createMockIapProvider(),
    presentConsent:
      typeof consent === 'function' ? consent : async (): Promise<boolean> => consent,
    now: () => NOW,
  });
  return { storage, bus, mon, events };
}

describe('showRewardedAd — جریان رضایت‌محور', () => {
  it('جلسه‌ی اول → unavailable بدون هیچ تماسی با provider', async () => {
    const show = vi.fn();
    const { mon } = setup({ firstSession: true, adShow: show });
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
    expect(show).not.toHaveBeenCalled();
    expect(mon.adPlacementsHidden()).toBe(true);
  });

  it('رد رضایت → skipped و شمارنده مصرف نمی‌شود', async () => {
    const { mon, storage, events } = setup({ consent: false });
    expect(await mon.showRewardedAd('hint')).toBe('skipped');
    expect(readIapState(storage).ads.count).toBe(0);
    expect(events).toHaveLength(0);
  });

  it('پذیرش → rewarded + شمارنده + رویداد reward_ad_completed', async () => {
    const { mon, storage, events } = setup();
    expect(await mon.showRewardedAd('extra_guess')).toBe('rewarded');
    expect(readIapState(storage).ads.count).toBe(1);
    expect(events).toEqual([{ type: 'reward_ad_completed', placement: 'extra_guess' }]);
  });

  it('provider آماده نیست → unavailable بدون پرسیدن رضایت', async () => {
    const consent = vi.fn(async () => true);
    const { mon } = setup({ consent, adReady: async () => false });
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
    expect(consent).not.toHaveBeenCalled();
  });

  it('پس از ۳ پاداش، چهارمی unavailable (سقف روزانه)', async () => {
    const { mon } = setup();
    for (let i = 0; i < 3; i++) {
      expect(await mon.showRewardedAd('hint')).toBe('rewarded');
    }
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
  });

  it('کاربر skip کند (وسط ویدئو) → پاداش و شمارنده ثبت نمی‌شود', async () => {
    const { mon, storage, events } = setup({ adShow: async () => 'skipped' });
    expect(await mon.showRewardedAd('hint')).toBe('skipped');
    expect(readIapState(storage).ads.count).toBe(0);
    expect(events).toHaveLength(0);
  });

  it('exception در provider → unavailable (silent degrade)', async () => {
    const { mon } = setup({
      adShow: async () => {
        throw new Error('sdk crash');
      },
    });
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
  });

  it('قفل هم‌زمانی: دو درخواست موازی، یکی نمایش داده می‌شود', async () => {
    let resolveConsent!: (v: boolean) => void;
    const { mon } = setup({
      consent: () => new Promise<boolean>((r) => (resolveConsent = r)),
    });
    const p1 = mon.showRewardedAd('hint');
    const p2 = mon.showRewardedAd('hint');
    // یک tick صبر تا p1 به مرحله‌ی رضایت برسد (isReady async است)
    await new Promise((r) => setTimeout(r, 0));
    resolveConsent(true);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect([r1, r2].sort()).toEqual(['rewarded', 'unavailable']);
  });

  it('کاربر طلایی → unavailable', async () => {
    const { mon } = setup();
    await mon.purchase('golden');
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
    expect(mon.adPlacementsHidden()).toBe(true);
  });
});

describe('purchase — خرید و مالکیت', () => {
  it('خرید موفق → مالکیت + رویداد purchase_completed', async () => {
    const { mon, events } = setup();
    expect(mon.isGolden()).toBe(false);
    expect(await mon.purchase('golden')).toBe('ok');
    expect(mon.isGolden()).toBe(true);
    expect(mon.ownsSku('golden')).toBe(true);
    expect(events).toContainEqual({ type: 'purchase_completed', sku: 'golden' });
  });

  it('انصراف → cancelled بدون مالکیت', async () => {
    const storage = makeStorage();
    completeOnboarding(storage);
    const mon = createMonetization({
      storage,
      bus: makeBus(),
      iapProvider: createMockIapProvider({
        purchase: async () => ({ result: 'cancelled' as const }),
      }),
      now: () => NOW,
    });
    expect(await mon.purchase('pack_cinema')).toBe('cancelled');
    expect(mon.ownsSku('pack_cinema')).toBe(false);
  });

  it('exception در provider خرید → error', async () => {
    const storage = makeStorage();
    const mon = createMonetization({
      storage,
      bus: makeBus(),
      iapProvider: createMockIapProvider({
        purchase: async () => {
          throw new Error('store down');
        },
      }),
    });
    expect(await mon.purchase('golden')).toBe('error');
  });

  it('restorePurchases مالکیت‌های استور را برمی‌گرداند', async () => {
    const storage = makeStorage();
    const mon = createMonetization({
      storage,
      bus: makeBus(),
      iapProvider: createMockIapProvider({
        restore: async () => [
          { sku: 'golden' as const, purchaseToken: 'a' },
          { sku: 'theme_pack_1' as const, purchaseToken: 'b' },
        ],
      }),
      now: () => NOW,
    });
    const { restored } = await mon.restorePurchases();
    expect(restored.sort()).toEqual(['golden', 'theme_pack_1']);
    expect(mon.isGolden()).toBe(true);
    // بار دوم چیزی «جدید» برنمی‌گردد
    expect((await mon.restorePurchases()).restored).toEqual([]);
  });
});

describe('attachEventListeners — wiring رویداد reward_ad_requested', () => {
  it('reward_ad_requested از EventBus جریان کامل را اجرا می‌کند', async () => {
    const { mon, bus, storage } = setup();
    const off = mon.attachEventListeners();
    bus.emit({ type: 'reward_ad_requested', placement: 'hint' });
    await new Promise((r) => setTimeout(r, 0));
    expect(readIapState(storage).ads.count).toBe(1);
    off();
    bus.emit({ type: 'reward_ad_requested', placement: 'hint' });
    await new Promise((r) => setTimeout(r, 0));
    expect(readIapState(storage).ads.count).toBe(1); // پس از off تغییری نیست
  });
});

describe('verifyReceipt — صحت‌سنجی رسید', () => {
  it('بدون verifier → وضعیت فعلی رسید', async () => {
    const s = makeStorage();
    const r = {
      sku: 'golden' as const,
      purchaseToken: 't',
      provider: 'bazaar' as const,
      purchasedAt: NOW,
      verified: false,
    };
    expect(await verifyReceipt(s, r)).toBe(false);
  });

  it('verifier موفق → رسید در storage به verified=true', async () => {
    const s = makeStorage();
    const { mon } = { mon: null };
    void mon;
    const receipt = {
      sku: 'golden' as const,
      purchaseToken: 't',
      provider: 'bazaar' as const,
      purchasedAt: NOW,
      verified: false,
    };
    // ابتدا رسید را ثبت می‌کنیم
    const { grantSku } = await import('../src/iap-state');
    grantSku(s, receipt);
    expect(await verifyReceipt(s, receipt, async () => true)).toBe(true);
    expect(readIapState(s).receipts[0]?.verified).toBe(true);
  });

  it('خطای شبکه‌ی verifier → مالکیت پس گرفته نمی‌شود', async () => {
    const s = makeStorage();
    const receipt = {
      sku: 'golden' as const,
      purchaseToken: 't',
      provider: 'bazaar' as const,
      purchasedAt: NOW,
      verified: false,
    };
    expect(
      await verifyReceipt(s, receipt, async () => {
        throw new Error('offline');
      }),
    ).toBe(false);
  });
});
