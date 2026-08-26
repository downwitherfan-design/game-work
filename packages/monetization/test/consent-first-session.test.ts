/**
 * تست مودال رضایت (ضد dark pattern) + تست صریح DoD:
 * «صفر نمایش تبلیغ در جلسه‌ی اول».
 */

import { describe, it, expect, vi } from 'vitest';
import { createMonetization } from '../src/controller';
import { buildConsentVNode, createDomConsentPresenter } from '../src/ui/consent-modal';
import { findInTree, textContent } from '../src/ui/vdom';
import { makeStorage, makeBus, makeT, completeOnboarding, makeDoc, type FakeNode } from './helpers';

const t = makeT();

describe('مودال رضایت — ضد dark pattern', () => {
  it('دو دکمه‌ی هم‌وزن، متن شفاف، فرصت باقی‌مانده با اعداد فارسی', () => {
    const tree = buildConsentVNode('hint', 2, t, () => undefined, () => undefined);
    expect(findInTree(tree, (n) => n.props.id === 'reward-consent-accept')).not.toBeNull();
    expect(findInTree(tree, (n) => n.props.id === 'reward-consent-decline')).not.toBeNull();
    const text = textContent(tree);
    expect(text).toContain('قبوله؟');
    expect(text).toContain('نه، ممنون');
    expect(text).toContain('۲');
  });

  it('متن placement حدس اضافه متفاوت از راهنماست', () => {
    const hintTree = buildConsentVNode('hint', 3, t, () => undefined, () => undefined);
    const guessTree = buildConsentVNode('extra_guess', 3, t, () => undefined, () => undefined);
    expect(textContent(hintTree)).toContain('راهنما');
    expect(textContent(guessTree)).toContain('حدس اضافه');
  });

  it('پذیرش → true؛ رد → false؛ backdrop → false (خروج آسان)', async () => {
    const storage = makeStorage();
    completeOnboarding(storage);
    const doc = makeDoc();
    const presenter = createDomConsentPresenter(storage, t, doc as unknown as Document);

    const p1 = presenter('hint');
    (doc.getElementById('reward-consent-accept') as FakeNode).click();
    expect(await p1).toBe(true);
    expect(doc.getElementById('reward-consent-backdrop')).toBeNull(); // پاک شده

    const p2 = presenter('extra_guess');
    (doc.getElementById('reward-consent-decline') as FakeNode).click();
    expect(await p2).toBe(false);

    const p3 = presenter('hint');
    (doc.getElementById('reward-consent-backdrop') as FakeNode).click();
    expect(await p3).toBe(false);
  });

  it('کلیک داخل مودال (نه دکمه) مودال را نمی‌بندد (stopPropagation)', async () => {
    const storage = makeStorage();
    const doc = makeDoc();
    const presenter = createDomConsentPresenter(storage, t, doc as unknown as Document);
    const p = presenter('hint');
    (doc.getElementById('reward-consent-modal') as FakeNode).click();
    expect(doc.getElementById('reward-consent-backdrop')).not.toBeNull(); // هنوز باز
    (doc.getElementById('reward-consent-accept') as FakeNode).click();
    expect(await p).toBe(true);
  });

  it('بدون DOM → false (تبلیغ نمایش داده نمی‌شود)', async () => {
    const presenter = createDomConsentPresenter(makeStorage(), t, undefined);
    expect(await presenter('hint')).toBe(false);
  });
});

describe('صفر نمایش تبلیغ در جلسه‌ی اول — تست صریح DoD', () => {
  it('در جلسه‌ی اول، حتی با درخواست مستقیم و رضایت آماده، هیچ تبلیغی نمایش داده نمی‌شود', async () => {
    const storage = makeStorage(); // بدون آنبوردینگ = جلسه‌ی اول
    const bus = makeBus();
    const show = vi.fn(async () => 'rewarded' as const);
    const consent = vi.fn(async () => true);
    const mon = createMonetization({
      storage,
      bus,
      adProvider: { id: 'mock', isReady: async () => true, show },
      presentConsent: consent,
    });
    mon.attachEventListeners();

    // از هر دو مسیر: API مستقیم و EventBus
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
    bus.emit({ type: 'reward_ad_requested', placement: 'extra_guess' });
    await new Promise((r) => setTimeout(r, 0));

    expect(show).not.toHaveBeenCalled();
    expect(consent).not.toHaveBeenCalled();
    expect(mon.adPlacementsHidden()).toBe(true);
  });

  it('پس از پایان آنبوردینگ همان کاربر، تبلیغ فعال می‌شود', async () => {
    const storage = makeStorage();
    const mon = createMonetization({
      storage,
      bus: makeBus(),
      presentConsent: async () => true,
    });
    expect(await mon.showRewardedAd('hint')).toBe('unavailable');
    completeOnboarding(storage); // AI-05 فلگ را می‌گذارد
    expect(await mon.showRewardedAd('hint')).toBe('rewarded');
  });
});
