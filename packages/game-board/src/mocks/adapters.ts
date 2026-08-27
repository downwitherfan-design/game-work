/**
 * آداپتور «واقعی یا mock» — برد بازی (AI-06) نباید به جزئیات ساختِ موتور
 * وابسته باشد. اگر پکیج مالک کارخانه‌ی واقعی را صادر کرده باشد از آن استفاده
 * می‌شود، وگرنه mock قراردادی. طبق 01_RED_LINES بند ۲ (آداپتور موقت).
 *
 * نکته: `createEngine` واقعی (AI-01) با تزریق وابستگی کار می‌کند —
 * `createEngine({ wordDb })`. در حالت standalone/دمو برد بازی به word-db
 * دسترسی ندارد، پس app-shell موتور واقعی را از بیرون تزریق می‌کند و اینجا
 * تنها در صورتی موتور واقعی ساخته می‌شود که wordDb پاس داده شده باشد.
 */

import type { AudioApi, EngineApi } from '@dordaneh/contracts';
import * as coreEngine from '@dordaneh/core-engine';
import * as audioHaptics from '@dordaneh/audio-haptics';
import { createMockEngine } from './mock-engine';
import { createMockAudio } from './mock-audio';

/** موتور واقعی اگر بتوان ساختش، وگرنه mock قراردادی */
export function resolveEngine(wordDb?: unknown): EngineApi {
  const pkg = coreEngine as unknown as Record<string, unknown>;
  const factory = pkg['createEngine'];
  if (typeof factory === 'function' && wordDb) {
    try {
      const candidate = (factory as (opts: { wordDb: unknown }) => EngineApi)({ wordDb });
      if (candidate && typeof candidate.evaluateGuess === 'function') return candidate;
    } catch {
      /* افت به mock */
    }
  }
  const preBuilt = pkg['engine'] as EngineApi | undefined;
  if (preBuilt && typeof preBuilt.evaluateGuess === 'function') return preBuilt;
  return createMockEngine();
}

/** صدای واقعی اگر صادر شده باشد، وگرنه mock بی‌صدا */
export function resolveAudio(): AudioApi {
  const pkg = audioHaptics as unknown as Record<string, unknown>;
  const factory = pkg['createAudio'];
  if (typeof factory === 'function') {
    try {
      const candidate = (factory as () => AudioApi)();
      if (candidate && typeof candidate.play === 'function') return candidate;
    } catch {
      /* افت به mock */
    }
  }
  const preBuilt = pkg['audio'] as AudioApi | undefined;
  if (preBuilt && typeof preBuilt.play === 'function') return preBuilt;
  return createMockAudio();
}
