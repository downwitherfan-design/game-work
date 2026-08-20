/**
 * آداپتور IAP مایکت — اسکلت با بارگذاری دینامیک از پل native.
 * ساختار یکسان با بازار؛ فقط پل متفاوت (`DordanehNative.myketIap`).
 */

import type { PurchaseResult, Sku } from '@dordaneh/contracts';
import type { IapProvider } from '../types';
import { asSku, getNativeBridge } from './native-bridge';

export function createMyketIapProvider(): IapProvider {
  return {
    id: 'myket',
    async purchase(sku: Sku): Promise<{ result: PurchaseResult; purchaseToken?: string }> {
      const bridge = getNativeBridge()?.myketIap;
      if (!bridge) return { result: 'error' };
      try {
        return await bridge.purchase(sku);
      } catch {
        return { result: 'error' };
      }
    },
    async restore(): Promise<{ sku: Sku; purchaseToken: string }[]> {
      const bridge = getNativeBridge()?.myketIap;
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
