/**
 * آداپتور IAP کافه‌بازار — اسکلت با بارگذاری دینامیک از پل native.
 * (پلاگین Poolakey/Capacitor مال AI-14 در `native/` — قرارداد پل در README.)
 * پل غایب/خراب → 'error' بدون exception.
 */

import type { PurchaseResult, Sku } from '@dordaneh/contracts';
import type { IapProvider } from '../types';
import { asSku, getNativeBridge } from './native-bridge';

export function createBazaarIapProvider(): IapProvider {
  return {
    id: 'bazaar',
    async purchase(sku: Sku): Promise<{ result: PurchaseResult; purchaseToken?: string }> {
      const bridge = getNativeBridge()?.bazaarIap;
      if (!bridge) return { result: 'error' };
      try {
        return await bridge.purchase(sku);
      } catch {
        return { result: 'error' };
      }
    },
    async restore(): Promise<{ sku: Sku; purchaseToken: string }[]> {
      const bridge = getNativeBridge()?.bazaarIap;
      if (!bridge) return [];
      try {
        const purchases = await bridge.getPurchases();
        const out: { sku: Sku; purchaseToken: string }[] = [];
        for (const p of purchases) {
          const sku = asSku(p.sku);
          if (sku) out.push({ sku, purchaseToken: p.purchaseToken });
        }
        return out;
      } catch {
        return [];
      }
    },
  };
}
