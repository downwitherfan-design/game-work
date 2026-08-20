/**
 * تست لحظه‌های پیشنهاد — Peak-End بدون مزاحمت.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  attachOfferMoments,
  canShowOffer,
  recordOfferShown,
  DEFAULT_OFFER_CONFIG,
} from '../src/offer-moments';
import { grantSku } from '../src/iap-state';
import { makeStorage, makeBus, completeOnboarding } from './helpers';

const NOW = Date.UTC(2026, 8, 10, 12, 0, 0);

describe('canShowOffer — شرایط نمایش', () => {
  it('جلسه‌ی اول → هرگز', () => {
    const s = makeStorage();
    expect(canShowOffer(s, NOW)).toBe(false);
  });

  it('کاربر طلایی → هرگز', () => {
    const s = makeStorage();
    completeOnboarding(s);
    grantSku(s, {
      sku: 'golden',
      purchaseToken: 't',
      provider: 'mock',
      purchasedAt: NOW,
      verified: true,
    });
    expect(canShowOffer(s, NOW)).toBe(false);
  });

  it('frequency cap: حداقل ۷ روز فاصله', () => {
    const s = makeStorage();
    completeOnboarding(s);
    expect(canShowOffer(s, NOW)).toBe(true);
    recordOfferShown(s, NOW);
    expect(canShowOffer(s, NOW + 6 * 24 * 3600_000)).toBe(false);
    expect(canShowOffer(s, NOW + 8 * 24 * 3600_000)).toBe(true);
  });

  it('سقف کل عمر: ۳ بار', () => {
    const s = makeStorage();
    completeOnboarding(s);
    for (let i = 0; i < DEFAULT_OFFER_CONFIG.lifetimeCap; i++) {
      recordOfferShown(s, NOW + i * 10 * 24 * 3600_000);
    }
    expect(canShowOffer(s, NOW + 365 * 24 * 3600_000)).toBe(false);
  });
});

describe('attachOfferMoments — trigger از streak_changed', () => {
  it('مصرف فریز (frozen=true) → پیشنهاد freeze_used', () => {
    const s = makeStorage();
    completeOnboarding(s);
    const bus = makeBus();
    const show = vi.fn();
    attachOfferMoments(s, bus, show, DEFAULT_OFFER_CONFIG, () => NOW);
    bus.emit({ type: 'streak_changed', value: 5, frozen: true });
    expect(show).toHaveBeenCalledWith('freeze_used');
  });

  it('استریک ۱۴ → پیشنهاد streak_14', () => {
    const s = makeStorage();
    completeOnboarding(s);
    const bus = makeBus();
    const show = vi.fn();
    attachOfferMoments(s, bus, show, DEFAULT_OFFER_CONFIG, () => NOW);
    bus.emit({ type: 'streak_changed', value: 14, frozen: false });
    expect(show).toHaveBeenCalledWith('streak_14');
  });

  it('استریک عادی (نه ۱۴، نه فریز) → هیچ پیشنهادی', () => {
    const s = makeStorage();
    completeOnboarding(s);
    const bus = makeBus();
    const show = vi.fn();
    attachOfferMoments(s, bus, show, DEFAULT_OFFER_CONFIG, () => NOW);
    bus.emit({ type: 'streak_changed', value: 7, frozen: false });
    expect(show).not.toHaveBeenCalled();
  });

  it('دو trigger پشت هم → فقط یکی (frequency cap ثبت می‌شود)', () => {
    const s = makeStorage();
    completeOnboarding(s);
    const bus = makeBus();
    const show = vi.fn();
    attachOfferMoments(s, bus, show, DEFAULT_OFFER_CONFIG, () => NOW);
    bus.emit({ type: 'streak_changed', value: 5, frozen: true });
    bus.emit({ type: 'streak_changed', value: 14, frozen: false });
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('در جلسه‌ی اول حتی با trigger → هیچ', () => {
    const s = makeStorage();
    const bus = makeBus();
    const show = vi.fn();
    attachOfferMoments(s, bus, show, DEFAULT_OFFER_CONFIG, () => NOW);
    bus.emit({ type: 'streak_changed', value: 14, frozen: false });
    expect(show).not.toHaveBeenCalled();
  });

  it('exception در showOffer جریان را نمی‌شکند', () => {
    const s = makeStorage();
    completeOnboarding(s);
    const bus = makeBus();
    attachOfferMoments(
      s,
      bus,
      () => {
        throw new Error('ui crash');
      },
      DEFAULT_OFFER_CONFIG,
      () => NOW,
    );
    expect(() => bus.emit({ type: 'streak_changed', value: 14, frozen: false })).not.toThrow();
  });

  it('detach → دیگر گوش نمی‌دهد', () => {
    const s = makeStorage();
    completeOnboarding(s);
    const bus = makeBus();
    const show = vi.fn();
    const off = attachOfferMoments(s, bus, show, DEFAULT_OFFER_CONFIG, () => NOW);
    off();
    bus.emit({ type: 'streak_changed', value: 14, frozen: false });
    expect(show).not.toHaveBeenCalled();
  });
});
