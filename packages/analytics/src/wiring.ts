/**
 * اتصال به EventBus — قرارداد §8: «AI-12 خودش به EventBus گوش می‌دهد؛
 * هیچ پکیجی مستقیماً analytics صدا نمی‌زند (جز app-shell برای wiring)».
 *
 * app-shell فقط این تابع را با bus و instance صدا می‌زند؛ همین.
 */

import type { AnalyticsApi, AppEvent, EventBus } from '@dordaneh/contracts';

/** همه‌ی انواع رویداد قرارداد — منبع: docs/02_CONTRACTS.md §5. */
export const ALL_APP_EVENT_TYPES: readonly AppEvent['type'][] = [
  'puzzle_started',
  'guess_submitted',
  'puzzle_finished',
  'card_revealed',
  'share_initiated',
  'share_completed',
  'streak_changed',
  'reward_ad_requested',
  'reward_ad_completed',
  'purchase_completed',
  'screen_viewed',
] as const;

/**
 * همه‌ی رویدادهای bus را به analytics.track هدایت می‌کند.
 * خروجی: تابع unsubscribe کلی (برای teardown در app-shell).
 */
export function wireAnalyticsToBus(bus: EventBus, analytics: AnalyticsApi): () => void {
  const offs = ALL_APP_EVENT_TYPES.map((type) =>
    bus.on(type, (e) => {
      analytics.track(e);
    }),
  );
  return () => {
    for (const off of offs) off();
  };
}
