/**
 * آداپتور تپسل (Rewarded فقط) — اسکلت با بارگذاری دینامیک از پل native.
 * SDK تپسل در این پکیج import نمی‌شود؛ AI-14 پلاگین Capacitor را در `native/`
 * می‌سازد و پل را روی `globalThis.DordanehNative.tapsell` تزریق می‌کند.
 * پل غایب/خراب → 'unavailable' (silent degrade — اپ آفلاین-اول).
 */

import type { RewardedPlacement, RewardedResult } from '@dordaneh/contracts';
import type { AdProvider } from '../types';
import { getNativeBridge } from './native-bridge';

/**
 * zoneId های تپسل per-placement — مقدار واقعی را AI-14 در بیلد native تزریق
 * می‌کند (env). هیچ API key در ریپو نیست (خط قرمز ۱۱).
 */
export interface TapsellZoneConfig {
  extra_guess: string;
  hint: string;
}

const PLACEHOLDER_ZONES: TapsellZoneConfig = {
  extra_guess: 'ZONE_EXTRA_GUESS_FROM_ENV',
  hint: 'ZONE_HINT_FROM_ENV',
};

export function createTapsellAdProvider(zones: TapsellZoneConfig = PLACEHOLDER_ZONES): AdProvider {
  return {
    id: 'tapsell',
    async isReady(placement: RewardedPlacement): Promise<boolean> {
      const bridge = getNativeBridge()?.tapsell;
      if (!bridge) return false;
      try {
        return await bridge.isRewardedReady(zones[placement]);
      } catch {
        return false;
      }
    },
    async show(placement: RewardedPlacement): Promise<RewardedResult> {
      const bridge = getNativeBridge()?.tapsell;
      if (!bridge) return 'unavailable';
      try {
        return await bridge.showRewarded(zones[placement]);
      } catch {
        return 'unavailable';
      }
    },
  };
}
