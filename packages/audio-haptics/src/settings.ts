/**
 * @dordaneh/audio-haptics — تنظیمات ماندگار صدا روی StorageApi قرارداد.
 * ⚠️ کلید 'dor.settings' مال app-shell است — ما namespace خودمان را داریم:
 * 'dor.audio.settings'. app-shell سوییچ‌های UI را به همین API بایند می‌کند.
 * مالک: AI-13.
 */

import type { StorageApi } from '@dordaneh/contracts';

/** کلید انحصاری این پکیج (خارج از کلیدهای رزروشده‌ی قرارداد §5). */
export const AUDIO_SETTINGS_KEY = 'dor.audio.settings';

export interface AudioSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  /** «حالت سکوت هوشمند»: شمار جلسه‌های اولیه که کاربر صدا را خاموش کرد. */
  earlyMutes: number;
  /** شمار جلسه‌های ثبت‌شده (برای پنجره‌ی ۳ جلسه‌ی اول). */
  sessions: number;
}

export const DEFAULT_SETTINGS: AudioSettings = {
  sfxEnabled: true,
  musicEnabled: false, // پیش‌فرض خاموش (سند راهبردی)
  earlyMutes: 0,
  sessions: 0,
};

/** پنجره و آستانه‌ی «سکوت هوشمند». */
export const EARLY_SESSION_WINDOW = 3;

export class SettingsStore {
  private cache: AudioSettings;

  constructor(private readonly storage: StorageApi) {
    const raw = storage.get<Partial<AudioSettings>>(AUDIO_SETTINGS_KEY);
    this.cache = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  }

  get(): AudioSettings {
    return { ...this.cache };
  }

  private save(): void {
    this.storage.set(AUDIO_SETTINGS_KEY, this.cache);
  }

  setSfxEnabled(on: boolean): void {
    // اگر کاربر در جلسه‌های اول خاموش کرد، ثبت کن (احترام به ترجیح = اعتماد)
    if (!on && this.cache.sfxEnabled && this.cache.sessions <= EARLY_SESSION_WINDOW) {
      this.cache.earlyMutes += 1;
    }
    this.cache.sfxEnabled = on;
    this.save();
  }

  setMusicEnabled(on: boolean): void {
    this.cache.musicEnabled = on;
    this.save();
  }

  /** app-shell در آغاز هر جلسه صدا بزند — برای پنجره‌ی سکوت هوشمند. */
  markSessionStart(): void {
    this.cache.sessions += 1;
    this.save();
  }

  /**
   * «حالت سکوت هوشمند»: اگر کاربر در ۳ جلسه‌ی اول صدا را خاموش کرده،
   * UI دیگر آیکون صدا را برجسته/پرومو نکند. app-shell این را می‌خواند.
   */
  shouldSoftPedalAudioUi(): boolean {
    return this.cache.earlyMutes >= 1 && this.cache.sessions >= EARLY_SESSION_WINDOW;
  }
}
