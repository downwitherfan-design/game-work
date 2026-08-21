/**
 * رجیستری سرویس‌ها — نقطه‌ی مونتاژ: از هر پکیج فقط entry point رسمی import
 * می‌شود؛ اگر export مورد انتظار قرارداد هنوز موجود نباشد (پکیج در حال ساخت
 * توسط AI مالک)، به‌صورت خودکار روی mock قراردادی داخل src/mocks سوییچ می‌کنیم.
 * هرگز منتظر کسی نمی‌مانیم و هرگز به جای کسی کد نمی‌نویسیم.
 */
import type {
  AnalyticsApi,
  AudioApi,
  CultureApi,
  EngineApi,
  EventBus,
  MonetizationApi,
  ShareApi,
} from '@dordaneh/contracts';
// entry point رسمی پکیج‌ها (خط قرمز ۵: هرگز مسیر داخلی)
import * as coreEngine from '@dordaneh/core-engine';
import * as cultureCards from '@dordaneh/culture-cards';
import * as audioHaptics from '@dordaneh/audio-haptics';
import * as analyticsPkg from '@dordaneh/analytics';
import * as monetizationPkg from '@dordaneh/monetization';
import * as viralShare from '@dordaneh/viral-share';
import { createMockEngine } from '../mocks/engine.mock';
import {
  createMockAnalytics,
  createMockAudio,
  createMockCulture,
  createMockMonetization,
  createMockShare,
} from '../mocks/services.mock';
import type { ShellStorage } from '../core/storage';

export interface ShellServices {
  engine: EngineApi;
  culture: CultureApi;
  audio: AudioApi;
  analytics: AnalyticsApi;
  monetization: MonetizationApi;
  share: ShareApi;
  /** برای دیباگ/تست: کدام سرویس‌ها mock هستند */
  mockFlags: Record<string, boolean>;
}

type Factory<T> = (bus: EventBus, storage: ShellStorage) => T;

/** شکل رایج export پکیج‌ها: یا factory createXxx یا نمونه‌ی آماده */
function pick<T>(
  pkg: Record<string, unknown>,
  factoryNames: string[],
  instanceNames: string[],
  bus: EventBus,
  storage: ShellStorage,
): T | null {
  for (const name of factoryNames) {
    const f = pkg[name];
    if (typeof f === 'function') {
      try {
        return (f as Factory<T>)(bus, storage);
      } catch {
        return null;
      }
    }
  }
  for (const name of instanceNames) {
    const v = pkg[name];
    if (v && typeof v === 'object') return v as T;
  }
  return null;
}

export function createServices(bus: EventBus, storage: ShellStorage): ShellServices {
  const engine =
    pick<EngineApi>(
      coreEngine as Record<string, unknown>,
      ['createEngine', 'createEngineApi'],
      ['engine', 'engineApi'],
      bus,
      storage,
    ) ?? null;
  const culture =
    pick<CultureApi>(
      cultureCards as Record<string, unknown>,
      ['createCultureApi', 'createCulture'],
      ['cultureApi', 'culture'],
      bus,
      storage,
    ) ?? null;
  const audio =
    pick<AudioApi>(
      audioHaptics as Record<string, unknown>,
      ['createAudioApi', 'createAudio'],
      ['audioApi', 'audio'],
      bus,
      storage,
    ) ?? null;
  const analytics =
    pick<AnalyticsApi>(
      analyticsPkg as Record<string, unknown>,
      ['createAnalyticsApi', 'createAnalytics'],
      ['analyticsApi', 'analytics'],
      bus,
      storage,
    ) ?? null;
  const monetization =
    pick<MonetizationApi>(
      monetizationPkg as Record<string, unknown>,
      ['createMonetizationApi', 'createMonetization'],
      ['monetizationApi', 'monetization'],
      bus,
      storage,
    ) ?? null;
  const share =
    pick<ShareApi>(
      viralShare as Record<string, unknown>,
      ['createShareApi', 'createShare'],
      ['shareApi', 'share'],
      bus,
      storage,
    ) ?? null;

  return {
    engine: engine ?? createMockEngine(),
    culture: culture ?? createMockCulture(storage),
    audio: audio ?? createMockAudio(),
    analytics: analytics ?? createMockAnalytics(storage),
    monetization: monetization ?? createMockMonetization(storage),
    share: share ?? createMockShare(),
    mockFlags: {
      engine: engine === null,
      culture: culture === null,
      audio: audio === null,
      analytics: analytics === null,
      monetization: monetization === null,
      share: share === null,
    },
  };
}
