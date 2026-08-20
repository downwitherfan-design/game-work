/**
 * @dordaneh/audio-haptics — مالک: AI-13.
 * پیاده‌سازی کامل قرارداد AudioApi (docs/02_CONTRACTS.md §9):
 *   play(SfxName) · setMusicEnabled · setSfxEnabled · haptic(HapticKind)
 *
 * معماری:
 *  - Web Audio API با AudioContext تنبل (پس از اولین ژست کاربر) و بافرهای
 *    از-پیش-سنتزشده → latency پخش < 50ms (Game Feel — Swink 2008).
 *  - همه‌ی صداها سنتز قطعی درون-کد (شور/سنتورگون) → صفر asset باینری،
 *    صفر مسئله‌ی لایسنس، سهم باندل ناچیز.
 *  - هپتیک: Capacitor (feature-detect در runtime) → navigator.vibrate → noop.
 *  - تنظیمات ماندگار روی StorageApi قرارداد با کلید انحصاری 'dor.audio.settings'.
 */

import type { AudioApi, SfxName, HapticKind, StorageApi } from '@dordaneh/contracts';
import { createMemoryStorage } from '@dordaneh/contracts';
import { AudioEngine, type EngineOptions } from './engine';
import { createHaptics, type HapticsDriver, type GlobalLike } from './haptics';
import { SettingsStore } from './settings';
import { ARPEGGIO_DEGREES, BRAND_ROOT } from './sfx-defs';
import { shurFreq } from './dsp';

export interface CreateAudioOptions {
  /** StorageApi قرارداد (app-shell نسخه‌ی localStorage را می‌دهد). */
  storage?: StorageApi;
  /** ریشه‌ی سراسری برای feature-detect هپتیک (تست‌پذیری). */
  globalRef?: GlobalLike;
  /** گزینه‌های موتور (mock در تست). */
  engine?: EngineOptions;
}

/** سطح گسترش‌یافته‌ی API — AudioApi قرارداد + قابلیت‌های اختصاصی پکیج. */
export interface DordanehAudio extends AudioApi {
  /**
   * باید داخل اولین handler ژست کاربر صدا زده شود (سیاست autoplay).
   * game-board/app-shell: `pointerdown` اول → `audio.unlock()`.
   */
  unlock(): void;
  /** هارمونی ردیف حدس: کاشی درست iام = نت بعدی آرپژ شور. */
  playTileNote(tileIndex: number): void;
  /** لایت‌موتیف استریک: جینگل win با لایه‌ی تزئینی ۷/۳۰/۱۰۰ روز. */
  setStreakDays(days: number): void;
  /** آغاز جلسه — برای پنجره‌ی «سکوت هوشمند». */
  markSessionStart(): void;
  /** آیا UI باید آیکون صدا را کم‌رنگ‌تر پرومو کند؟ (احترام به ترجیح) */
  shouldSoftPedalAudioUi(): boolean;
  /** وضعیت فعلی تنظیمات (برای بایند سوییچ‌های app-shell). */
  isSfxEnabled(): boolean;
  isMusicEnabled(): boolean;
  /** آزادسازی منابع (تست/HMR). */
  dispose(): void;
}

/** نسبت‌های playbackRate آرپژ (درجه‌ی شور نسبت به بافر پایه‌ی correct). */
const CORRECT_BASE_FREQ = shurFreq(BRAND_ROOT, 4);
const ARPEGGIO_RATIOS: readonly number[] = ARPEGGIO_DEGREES.map(
  (d) => shurFreq(BRAND_ROOT, d + 4) / CORRECT_BASE_FREQ,
);

/** کارخانه‌ی اصلی — app-shell یک نمونه می‌سازد و به همه تزریق می‌کند. */
export function createAudio(opts: CreateAudioOptions = {}): DordanehAudio {
  const storage = opts.storage ?? createMemoryStorage();
  const settings = new SettingsStore(storage);
  const engine = new AudioEngine(opts.engine);
  let haptics: HapticsDriver = createHaptics(opts.globalRef);

  // اعمال تنظیمات ماندگار پس از unlock (میکسر آن‌موقع ساخته می‌شود)
  const applySettings = (): void => {
    const s = settings.get();
    engine.setSfxEnabled(s.sfxEnabled);
    engine.setMusicPlaying(s.musicEnabled);
  };

  return {
    unlock(): void {
      const wasReady = engine.ready;
      engine.unlock();
      if (!wasReady && engine.ready) {
        applySettings();
        // پلاگین Capacitor ممکن است پس از load تزریق شده باشد — دوباره detect کن
        haptics = createHaptics(opts.globalRef);
      }
    },

    play(name: SfxName): void {
      engine.play(name);
    },

    playTileNote(tileIndex: number): void {
      engine.playArpeggioTile(tileIndex, ARPEGGIO_RATIOS);
    },

    setSfxEnabled(on: boolean): void {
      settings.setSfxEnabled(on);
      engine.setSfxEnabled(on);
    },

    setMusicEnabled(on: boolean): void {
      settings.setMusicEnabled(on);
      engine.setMusicPlaying(on);
    },

    haptic(kind: HapticKind): void {
      if (!settings.get().sfxEnabled) return; // خاموشی صدا = خاموشی لرزش (کم‌مزاحمت)
      haptics.trigger(kind);
    },

    setStreakDays(days: number): void {
      engine.setStreakDays(days);
    },

    markSessionStart(): void {
      settings.markSessionStart();
    },

    shouldSoftPedalAudioUi(): boolean {
      return settings.shouldSoftPedalAudioUi();
    },

    isSfxEnabled(): boolean {
      return settings.get().sfxEnabled;
    },

    isMusicEnabled(): boolean {
      return settings.get().musicEnabled;
    },

    dispose(): void {
      engine.dispose();
    },
  };
}

// ── صادرات عمومی پکیج ──
export { AudioEngine, defaultContextFactory } from './engine';
export type {
  EngineOptions,
  EngineContextLike,
  BufferSourceLike,
  AudioBufferLike,
  ContextFactory,
} from './engine';
export {
  Mixer,
  Throttle,
  expFade,
  pitchVariation,
  DUCKING_SFX,
  EPS,
} from './mixer';
export type { MixerOptions, ContextLike, GainNodeLike, AudioParamLike } from './mixer';
export {
  createHaptics,
  createWebDriver,
  createCapacitorDriver,
  NOOP_DRIVER,
  VIBRATION_PATTERNS,
} from './haptics';
export type { HapticsDriver, GlobalLike } from './haptics';
export {
  SettingsStore,
  AUDIO_SETTINGS_KEY,
  DEFAULT_SETTINGS,
  EARLY_SESSION_WINDOW,
} from './settings';
export type { AudioSettings } from './settings';
export {
  renderSfx,
  renderMusicLoop,
  winJingle,
  streakLayersFor,
  arpeggioFreq,
  ALL_SFX,
  ARPEGGIO_DEGREES,
  BRAND_ROOT,
} from './sfx-defs';
export {
  SAMPLE_RATE,
  SHUR_CENTS,
  shurFreq,
  centsToRatio,
  render,
  mixBuffers,
  mulberry32,
} from './dsp';
