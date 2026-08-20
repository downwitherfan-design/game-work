/**
 * تست سیاست اخلاقی تبلیغ — مهم‌ترین تست‌های پکیج (خطوط قرمز ۱۲ و ۱۳).
 */

import { describe, it, expect } from 'vitest';
import {
  checkAdEligibility,
  adsRemainingToday,
  adsWatchedToday,
  isFirstSession,
  shouldHideAdPlacements,
  tehranDateKey,
} from '../src/ad-policy';
import { recordAdWatched } from '../src/ad-policy';
import { grantSku, readIapState, writeIapState, emptyIapState } from '../src/iap-state';
import { DAILY_REWARDED_AD_CAP } from '../src/types';
import { makeStorage, completeOnboarding } from './helpers';

const NOW = Date.UTC(2026, 8, 10, 12, 0, 0); // 2026-09-10 12:00 UTC

describe('جلسه‌ی اول — صفر تبلیغ (خط قرمز ۱۳)', () => {
  it('بدون پروفایل → جلسه‌ی اول فرض می‌شود (محافظه‌کارانه)', () => {
    const s = makeStorage();
    expect(isFirstSession(s)).toBe(true);
    expect(checkAdEligibility(s, NOW)).toEqual({ eligible: false, reason: 'first_session' });
    expect(shouldHideAdPlacements(s)).toBe(true);
  });

  it('پروفایل خراب/ناقص → همچنان جلسه‌ی اول (امن‌ترین حالت)', () => {
    const s = makeStorage();
    s.set('dor.profile', { name: 'مسافر' });
    expect(isFirstSession(s)).toBe(true);
    s.set('dor.profile', 'garbage');
    expect(isFirstSession(s)).toBe(true);
  });

  it('با هر یک از فلگ‌های مرسوم آنبوردینگ → جلسه‌ی اول تمام', () => {
    for (const profile of [
      { onboardingDone: true },
      { onboardingCompleted: true },
      { firstSessionDone: true },
      { sessionCount: 2 },
    ]) {
      const s = makeStorage();
      s.set('dor.profile', profile);
      expect(isFirstSession(s)).toBe(false);
    }
  });

  it('sessionCount=1 هنوز جلسه‌ی اول است', () => {
    const s = makeStorage();
    s.set('dor.profile', { sessionCount: 1 });
    expect(isFirstSession(s)).toBe(true);
  });
});

describe('سقف روزانه‌ی ۳ تبلیغ', () => {
  it('پس از ۳ تبلیغ، چهارمی رد می‌شود', () => {
    const s = makeStorage();
    completeOnboarding(s);
    expect(adsRemainingToday(s, NOW)).toBe(DAILY_REWARDED_AD_CAP);
    for (let i = 0; i < DAILY_REWARDED_AD_CAP; i++) {
      expect(checkAdEligibility(s, NOW)).toEqual({ eligible: true });
      recordAdWatched(s, NOW);
    }
    expect(adsWatchedToday(s, NOW)).toBe(3);
    expect(adsRemainingToday(s, NOW)).toBe(0);
    expect(checkAdEligibility(s, NOW)).toEqual({ eligible: false, reason: 'daily_cap' });
  });

  it('روز بعد (به وقت تهران) شمارنده ریست می‌شود', () => {
    const s = makeStorage();
    completeOnboarding(s);
    for (let i = 0; i < 3; i++) recordAdWatched(s, NOW);
    const tomorrow = NOW + 24 * 3600_000;
    expect(tehranDateKey(tomorrow)).not.toBe(tehranDateKey(NOW));
    expect(adsRemainingToday(s, tomorrow)).toBe(DAILY_REWARDED_AD_CAP);
    expect(checkAdEligibility(s, tomorrow)).toEqual({ eligible: true });
  });

  it('tehranDateKey فرمت YYYY-MM-DD می‌دهد', () => {
    expect(tehranDateKey(NOW)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('کاربر طلایی — بدون تبلیغ', () => {
  it('کاربر طلایی هرگز تبلیغ نمی‌بیند و placement مخفی است', () => {
    const s = makeStorage();
    completeOnboarding(s);
    grantSku(s, {
      sku: 'golden',
      purchaseToken: 't1',
      provider: 'mock',
      purchasedAt: NOW,
      verified: true,
    });
    expect(checkAdEligibility(s, NOW)).toEqual({ eligible: false, reason: 'golden' });
    expect(shouldHideAdPlacements(s)).toBe(true);
  });

  it('کاربر عادی پس از آنبوردینگ placement را می‌بیند', () => {
    const s = makeStorage();
    completeOnboarding(s);
    expect(shouldHideAdPlacements(s)).toBe(false);
  });
});

describe('iap-state — خواندن/نوشتن ایمن', () => {
  it('داده‌ی خراب → حالت خالی بدون exception', () => {
    const s = makeStorage();
    s.set('dor.iap', 42);
    expect(readIapState(s)).toEqual(emptyIapState());
    s.set('dor.iap', { owned: ['bogus_sku', 'golden'], receipts: 'x', ads: null });
    const st = readIapState(s);
    expect(st.owned).toEqual(['golden']);
    expect(st.receipts).toEqual([]);
    expect(st.ads).toEqual({ date: '', count: 0 });
  });

  it('grantSku idempotent است (مالکیت و رسید تکراری نمی‌سازد)', () => {
    const s = makeStorage();
    const receipt = {
      sku: 'golden' as const,
      purchaseToken: 'tok',
      provider: 'mock' as const,
      purchasedAt: NOW,
      verified: true,
    };
    grantSku(s, receipt);
    grantSku(s, receipt);
    const st = readIapState(s);
    expect(st.owned).toEqual(['golden']);
    expect(st.receipts).toHaveLength(1);
  });

  it('writeIapState/readIapState رفت و برگشت سالم', () => {
    const s = makeStorage();
    const st = emptyIapState();
    st.owned.push('theme_pack_1');
    st.ads = { date: '2026-09-10', count: 2 };
    writeIapState(s, st);
    expect(readIapState(s)).toEqual(st);
  });
});
