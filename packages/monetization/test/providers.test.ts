/**
 * تست providerها — معماری آداپتور، بارگذاری دینامیک پل native، انتخاب env.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createMockAdProvider, createMockIapProvider } from '../src/providers/mock';
import { createTapsellAdProvider } from '../src/providers/tapsell';
import { createBazaarIapProvider } from '../src/providers/bazaar-iap';
import { createMyketIapProvider } from '../src/providers/myket-iap';
import {
  selectAdProvider,
  selectIapProvider,
  activeProviderIds,
  detectEnv,
  isNativeAndroid,
} from '../src/providers/select';
import { getNativeBridge, asSku } from '../src/providers/native-bridge';

const g = globalThis as {
  DordanehNative?: unknown;
  __DOR_ENV__?: { storeFlavor?: string; forceMock?: boolean };
};

afterEach(() => {
  delete g.DordanehNative;
  delete g.__DOR_ENV__;
});

describe('mock providers — قرارداد §10: همیشه rewarded/ok', () => {
  it('mock ad: ready + rewarded', async () => {
    const p = createMockAdProvider();
    expect(p.id).toBe('mock');
    expect(await p.isReady('hint')).toBe(true);
    expect(await p.show('extra_guess')).toBe('rewarded');
  });

  it('mock iap: ok با توکن', async () => {
    const p = createMockIapProvider();
    const r = await p.purchase('golden');
    expect(r.result).toBe('ok');
    expect(r.purchaseToken).toContain('golden');
    expect(await p.restore()).toEqual([]);
  });
});

describe('پل native — بارگذاری دینامیک و degrade امن', () => {
  it('بدون پل → tapsell unavailable و not ready', async () => {
    const p = createTapsellAdProvider();
    expect(await p.isReady('hint')).toBe(false);
    expect(await p.show('hint')).toBe('unavailable');
  });

  it('بدون پل → bazaar/myket error و restore خالی', async () => {
    for (const p of [createBazaarIapProvider(), createMyketIapProvider()]) {
      expect((await p.purchase('golden')).result).toBe('error');
      expect(await p.restore()).toEqual([]);
    }
  });

  it('با پل tapsell → نتیجه‌ی پل رد می‌شود', async () => {
    g.DordanehNative = {
      tapsell: {
        isRewardedReady: async () => true,
        showRewarded: async () => 'rewarded' as const,
      },
    };
    const p = createTapsellAdProvider({ extra_guess: 'z1', hint: 'z2' });
    expect(await p.isReady('extra_guess')).toBe(true);
    expect(await p.show('hint')).toBe('rewarded');
  });

  it('پل خراب (exception) → degrade بدون throw', async () => {
    g.DordanehNative = {
      tapsell: {
        isRewardedReady: async () => {
          throw new Error('x');
        },
        showRewarded: async () => {
          throw new Error('x');
        },
      },
      bazaarIap: {
        purchase: async () => {
          throw new Error('x');
        },
        getPurchases: async () => {
          throw new Error('x');
        },
      },
    };
    const ad = createTapsellAdProvider();
    expect(await ad.isReady('hint')).toBe(false);
    expect(await ad.show('hint')).toBe('unavailable');
    const iap = createBazaarIapProvider();
    expect((await iap.purchase('golden')).result).toBe('error');
    expect(await iap.restore()).toEqual([]);
  });

  it('restore فقط skuهای معتبر را برمی‌گرداند', async () => {
    g.DordanehNative = {
      myketIap: {
        purchase: async () => ({ result: 'ok' as const, purchaseToken: 't' }),
        getPurchases: async () => [
          { sku: 'golden', purchaseToken: 'a' },
          { sku: 'hacked_sku', purchaseToken: 'b' },
        ],
      },
    };
    const p = createMyketIapProvider();
    expect(await p.restore()).toEqual([{ sku: 'golden', purchaseToken: 'a' }]);
  });

  it('asSku فقط skuهای قرارداد را می‌پذیرد', () => {
    expect(asSku('golden')).toBe('golden');
    expect(asSku('pack_cooking')).toBe('pack_cooking');
    expect(asSku('evil')).toBeNull();
  });

  it('getNativeBridge با مقدار غیرشیء → null', () => {
    g.DordanehNative = 'nope';
    expect(getNativeBridge()).toBeNull();
  });
});

describe('انتخاب provider با env/platform', () => {
  it('وب (بدون پل) → mock/mock', () => {
    expect(isNativeAndroid()).toBe(false);
    expect(activeProviderIds()).toEqual({ ad: 'mock', iap: 'mock' });
  });

  it('forceMock حتی با پل → mock', () => {
    g.DordanehNative = {
      tapsell: { isRewardedReady: async () => true, showRewarded: async () => 'rewarded' as const },
    };
    expect(selectAdProvider({ forceMock: true }).id).toBe('mock');
    expect(selectIapProvider({ forceMock: true }).id).toBe('mock');
  });

  it('پل تپسل موجود → tapsell', () => {
    g.DordanehNative = {
      tapsell: { isRewardedReady: async () => true, showRewarded: async () => 'rewarded' as const },
    };
    expect(selectAdProvider({}).id).toBe('tapsell');
  });

  it('فلاور bazaar → bazaar؛ فلاور myket → myket', () => {
    const iapBridge = {
      purchase: async () => ({ result: 'ok' as const }),
      getPurchases: async () => [],
    };
    g.DordanehNative = { bazaarIap: iapBridge, myketIap: iapBridge };
    expect(selectIapProvider({ storeFlavor: 'bazaar' }).id).toBe('bazaar');
    expect(selectIapProvider({ storeFlavor: 'myket' }).id).toBe('myket');
  });

  it('فقط پل myket موجود (بدون فلاور) → myket', () => {
    g.DordanehNative = {
      myketIap: {
        purchase: async () => ({ result: 'ok' as const }),
        getPurchases: async () => [],
      },
    };
    expect(selectIapProvider({}).id).toBe('myket');
  });

  it('detectEnv از __DOR_ENV__ می‌خواند', () => {
    expect(detectEnv()).toEqual({});
    g.__DOR_ENV__ = { storeFlavor: 'myket', forceMock: false };
    expect(detectEnv()).toEqual({ storeFlavor: 'myket', forceMock: false });
  });
});
