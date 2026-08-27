/**
 * @dordaneh/qa — mockهای مرجع Analytics / Audio / Monetization
 * (تا آماده‌شدن پکیج‌های واقعی AI-12 / AI-13 / AI-11).
 */

import type {
  AnalyticsApi,
  AppEvent,
  AudioApi,
  HapticKind,
  MonetizationApi,
  PurchaseResult,
  RewardedPlacement,
  RewardedResult,
  SfxName,
  Sku,
} from '@dordaneh/contracts';

// ---------------------------------------------------------------------------
// Analytics — صف آفلاین درون‌حافظه‌ای؛ payloadها برای اسکن PII در تست نگه داشته می‌شوند.
// ---------------------------------------------------------------------------

export function createMockAnalytics(): AnalyticsApi & { queue: AppEvent[] } {
  const queue: AppEvent[] = [];
  const remote = new Map<string, unknown>();
  return {
    queue,
    track(e: AppEvent): void {
      queue.push(e);
    },
    getRemoteConfig<T>(key: string, fallback: T): T {
      return (remote.has(key) ? (remote.get(key) as T) : fallback);
    },
  };
}

// ---------------------------------------------------------------------------
// Audio — no-op با ثبت فراخوانی‌ها (هرگز throw نمی‌کند؛ صدا نباید بازی را بشکند).
// ---------------------------------------------------------------------------

export function createMockAudio(): AudioApi & {
  played: SfxName[];
  haptics: HapticKind[];
  musicEnabled: boolean;
  sfxEnabled: boolean;
} {
  const state = {
    played: [] as SfxName[],
    haptics: [] as HapticKind[],
    musicEnabled: true,
    sfxEnabled: true,
  };
  return {
    ...state,
    play(name: SfxName): void {
      state.played.push(name);
      this.played = state.played;
    },
    setMusicEnabled(on: boolean): void {
      state.musicEnabled = on;
      this.musicEnabled = on;
    },
    setSfxEnabled(on: boolean): void {
      state.sfxEnabled = on;
      this.sfxEnabled = on;
    },
    haptic(kind: HapticKind): void {
      state.haptics.push(kind);
      this.haptics = state.haptics;
    },
  };
}

// ---------------------------------------------------------------------------
// Monetization — mock وب/دِو: طبق §10 قرارداد، همیشه 'rewarded' و 'ok'.
// هرگز pay-to-win؛ هیچ SKU پیش‌فرض owned نیست.
// ---------------------------------------------------------------------------

export function createMockMonetization(): MonetizationApi & { purchased: Sku[] } {
  const purchased: Sku[] = [];
  return {
    purchased,
    isGolden(): boolean {
      return purchased.includes('golden');
    },
    ownsSku(sku: Sku): boolean {
      return purchased.includes(sku);
    },
    async showRewardedAd(_placement: RewardedPlacement): Promise<RewardedResult> {
      return 'rewarded';
    },
    async purchase(sku: Sku): Promise<PurchaseResult> {
      purchased.push(sku);
      return 'ok';
    },
  };
}
