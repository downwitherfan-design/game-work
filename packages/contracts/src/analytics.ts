/**
 * @dordaneh/contracts — AnalyticsApi contract (implemented by AI-12 in @dordaneh/analytics).
 * Source of truth: docs/02_CONTRACTS.md §8. Locked (RFC only).
 * قاعده: هیچ پکیجی مستقیماً analytics صدا نمی‌زند — AI-12 به EventBus گوش می‌دهد
 * (جز app-shell برای wiring).
 */

import type { AppEvent } from './events';

export interface AnalyticsApi {
  /** صف آفلاین + ارسال دسته‌ای */
  track(e: AppEvent): void;
  getRemoteConfig<T>(key: string, fallback: T): T;
}
