/**
 * Mock قراردادی AudioApi — تا آماده‌شدن @dordaneh/audio-haptics (AI-13).
 * بی‌صدا اما قابل‌بازرسی (برای تست) + هپتیک وب واقعی با navigator.vibrate
 * اگر موجود باشد (fail-soft).
 */

import type { AudioApi, HapticKind, SfxName } from '@dordaneh/contracts';

export interface MockAudioLog {
  played: SfxName[];
  haptics: HapticKind[];
}

const VIBRATE_MS: Readonly<Record<HapticKind, number | number[]>> = {
  light: 10,
  medium: 25,
  success: [15, 40, 25],
  error: [40, 30, 40],
};

export function createMockAudio(): AudioApi & { log: MockAudioLog } {
  const log: MockAudioLog = { played: [], haptics: [] };
  let sfxOn = true;

  return {
    log,
    play(name: SfxName): void {
      if (!sfxOn) return;
      log.played.push(name);
    },
    setMusicEnabled(_on: boolean): void {
      /* mock: بدون موسیقی */
    },
    setSfxEnabled(on: boolean): void {
      sfxOn = on;
    },
    haptic(kind: HapticKind): void {
      log.haptics.push(kind);
      try {
        const nav = (globalThis as { navigator?: { vibrate?: (p: number | number[]) => boolean } })
          .navigator;
        nav?.vibrate?.(VIBRATE_MS[kind]);
      } catch {
        /* fail-soft */
      }
    },
  };
}
