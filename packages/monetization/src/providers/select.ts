/**
 * انتخاب provider با env/platform detection.
 * - وب/dev/test → mock (قرارداد §10)
 * - اندروید + پل تپسل → tapsell
 * - اندروید + فلاور استور (bazaar|myket از env بیلد AI-14) → IAP همان استور
 */

import type { AdProvider, IapProvider, ProviderId } from '../types';
import { getNativeBridge } from './native-bridge';
import { createMockAdProvider, createMockIapProvider } from './mock';
import { createTapsellAdProvider } from './tapsell';
import { createBazaarIapProvider } from './bazaar-iap';
import { createMyketIapProvider } from './myket-iap';

export interface PlatformEnv {
  /** فلاور استور از env بیلد (VITE_DOR_STORE) — AI-14 تزریق می‌کند. */
  storeFlavor?: string;
  /** اجبار mock (dev/test) */
  forceMock?: boolean;
}

/** خواندن env بیلد به‌صورت fail-soft (وجود import.meta.env تضمین نشده). */
export function detectEnv(): PlatformEnv {
  const g = globalThis as { __DOR_ENV__?: { storeFlavor?: string; forceMock?: boolean } };
  if (g.__DOR_ENV__) return g.__DOR_ENV__;
  return {};
}

/** آیا روی WebView اندروید با پل native هستیم؟ */
export function isNativeAndroid(): boolean {
  return getNativeBridge() !== null;
}

export function selectAdProvider(env: PlatformEnv = detectEnv()): AdProvider {
  if (env.forceMock) return createMockAdProvider();
  if (isNativeAndroid() && getNativeBridge()?.tapsell) return createTapsellAdProvider();
  return createMockAdProvider();
}

export function selectIapProvider(env: PlatformEnv = detectEnv()): IapProvider {
  if (env.forceMock) return createMockIapProvider();
  const bridge = getNativeBridge();
  const flavor = (env.storeFlavor ?? '').toLowerCase();
  if (bridge?.myketIap && flavor === 'myket') return createMyketIapProvider();
  if (bridge?.bazaarIap && (flavor === 'bazaar' || flavor === '')) {
    return createBazaarIapProvider();
  }
  if (bridge?.myketIap) return createMyketIapProvider();
  return createMockIapProvider();
}

export function activeProviderIds(env: PlatformEnv = detectEnv()): {
  ad: ProviderId;
  iap: ProviderId;
} {
  return { ad: selectAdProvider(env).id, iap: selectIapProvider(env).id };
}
