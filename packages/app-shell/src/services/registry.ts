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
  WordDbApi,
} from '@dordaneh/contracts';
// entry point رسمی پکیج‌ها (خط قرمز ۵: هرگز مسیر داخلی)
import * as coreEngine from '@dordaneh/core-engine';
import * as wordDbPkg from '@dordaneh/word-db';
import * as cultureCards from '@dordaneh/culture-cards';
import * as audioHaptics from '@dordaneh/audio-haptics';
import * as analyticsPkg from '@dordaneh/analytics';
import * as monetizationPkg from '@dordaneh/monetization';
import * as viralShare from '@dordaneh/viral-share';
import { createMockEngine } from '../mocks/engine.mock';
import { createMockWordDb } from '../mocks/word-db.mock';
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

/**
 * word-db واقعی (AI-02) اگر آماده باشد؛ وگرنه mock قراردادی.
 * شکل‌های محتمل: createWordDb() یا نمونه‌ی آماده‌ی wordDb.
 */
function resolveWordDb(): { wordDb: WordDbApi; isMock: boolean } {
  const pkg = wordDbPkg as Record<string, unknown>;
  for (const name of ['createWordDb', 'createWordDbApi']) {
    const f = pkg[name];
    if (typeof f === 'function') {
      try {
        const candidate = (f as () => WordDbApi)();
        if (candidate && typeof candidate.getAnswer === 'function') {
          return { wordDb: candidate, isMock: false };
        }
      } catch {
        /* پکیج هنوز نیمه‌کاره — سکوت و سوییچ به mock */
      }
    }
  }
  for (const name of ['wordDb', 'wordDbApi']) {
    const v = pkg[name] as WordDbApi | undefined;
    if (v && typeof v.getAnswer === 'function') return { wordDb: v, isMock: false };
  }
  return { wordDb: createMockWordDb(), isMock: true };
}

/**
 * موتور واقعی (AI-01) امضای تزریق وابستگی دارد: createEngine({ wordDb }).
 * اگر word-db واقعی هنوز نیست، mock آن تزریق می‌شود (موتور واقعی + داده‌ی mock).
 */
function resolveEngine(wordDb: WordDbApi): EngineApi | null {
  const pkg = coreEngine as Record<string, unknown>;
  const f = pkg['createEngine'] ?? pkg['createEngineApi'];
  if (typeof f === 'function') {
    try {
      const candidate = (f as (opts: { wordDb: WordDbApi }) => EngineApi)({ wordDb });
      if (candidate && typeof candidate.getDailyPuzzle === 'function') return candidate;
    } catch {
      return null;
    }
  }
  for (const name of ['engine', 'engineApi']) {
    const v = pkg[name] as EngineApi | undefined;
    if (v && typeof v.getDailyPuzzle === 'function') return v;
  }
  return null;
}

/** صدا/لرزش واقعی (AI-13): createAudio({ storage? }) — storage برای پایایی تنظیمات صدا */
function resolveAudio(storage: ShellStorage): AudioApi | null {
  const pkg = audioHaptics as Record<string, unknown>;
  const f = pkg['createAudio'] ?? pkg['createAudioApi'];
  if (typeof f === 'function') {
    try {
      const candidate = (f as (opts: { storage: ShellStorage }) => AudioApi)({ storage });
      if (candidate && typeof candidate.play === 'function') return candidate;
    } catch {
      return null;
    }
  }
  for (const name of ['audio', 'audioApi']) {
    const v = pkg[name] as AudioApi | undefined;
    if (v && typeof v.play === 'function') return v;
  }
  return null;
}

export function createServices(bus: EventBus, storage: ShellStorage): ShellServices {
  const { wordDb, isMock: wordDbIsMock } = resolveWordDb();
  const engine = resolveEngine(wordDb);
  const culture =
    pick<CultureApi>(
      cultureCards as Record<string, unknown>,
      ['createCultureApi', 'createCulture'],
      ['cultureApi', 'culture'],
      bus,
      storage,
    ) ?? null;
  const audio = resolveAudio(storage);
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
      wordDb: wordDbIsMock,
      culture: culture === null,
      audio: audio === null,
      analytics: analytics === null,
      monetization: monetization === null,
      share: share === null,
    },
  };
}
