/**
 * Provider های mock — محیط وب/dev/test.
 * قرارداد §10: «در وب/دِو: پیاده‌سازی mock (همیشه rewarded/ok)».
 */

import type { RewardedPlacement, RewardedResult, PurchaseResult, Sku } from '@dordaneh/contracts';
import type { AdProvider, IapProvider } from '../types';

export function createMockAdProvider(
  overrides?: Partial<Pick<AdProvider, 'isReady' | 'show'>>,
): AdProvider {
  return {
    id: 'mock',
    async isReady(placement: RewardedPlacement): Promise<boolean> {
      if (overrides?.isReady) return overrides.isReady(placement);
      return true;
    },
    async show(placement: RewardedPlacement): Promise<RewardedResult> {
      if (overrides?.show) return overrides.show(placement);
      return 'rewarded';
    },
  };
}

export function createMockIapProvider(
  overrides?: Partial<{
    purchase: (sku: Sku) => Promise<{ result: PurchaseResult; purchaseToken?: string }>;
    restore: () => Promise<{ sku: Sku; purchaseToken: string }[]>;
  }>,
): IapProvider {
  return {
    id: 'mock',
    async purchase(sku: Sku) {
      if (overrides?.purchase) return overrides.purchase(sku);
      return { result: 'ok' as const, purchaseToken: `mock-token-${sku}` };
    },
    async restore() {
      if (overrides?.restore) return overrides.restore();
      return [];
    },
  };
}
