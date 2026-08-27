/**
 * آداپتور «واقعی یا mock» — تا وقتی پکیج‌های دیگران (core-engine, audio-haptics)
 * پیاده‌سازی صادر کنند، از mock داخلی استفاده می‌شود؛ به‌محض صادرشدن، همان‌ها
 * برداشته می‌شوند (بدون تغییر در GameScreen). طبق 01_RED_LINES بند ۲ (آداپتور موقت).
 */

import type { AudioApi, EngineApi } from '@dordaneh/contracts';
import * as coreEngine from '@dordaneh/core-engine';
import * as audioHaptics from '@dordaneh/audio-haptics';
import { createMockEngine } from './mock-engine';
import { createMockAudio } from './mock-audio';

interface EngineModuleLike {
  createEngine?: () => EngineApi;
  engine?: EngineApi;
}

interface AudioModuleLike {
  createAudio?: () => AudioApi;
  audio?: AudioApi;
}

/** موتور واقعی اگر صادر شده باشد، وگرنه mock قراردادی */
export function resolveEngine(): EngineApi {
  const m = coreEngine as EngineModuleLike;
  if (typeof m.createEngine === 'function') return m.createEngine();
  if (m.engine && typeof m.engine.evaluateGuess === 'function') return m.engine;
  return createMockEngine();
}

/** صدای واقعی اگر صادر شده باشد، وگرنه mock بی‌صدا */
export function resolveAudio(): AudioApi {
  const m = audioHaptics as AudioModuleLike;
  if (typeof m.createAudio === 'function') return m.createAudio();
  if (m.audio && typeof m.audio.play === 'function') return m.audio;
  return createMockAudio();
}
