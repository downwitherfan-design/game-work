import { describe, it, expect } from 'vitest';
import { createMemoryStorage, STORAGE_KEYS } from '@dordaneh/contracts';
import {
  SettingsStore,
  AUDIO_SETTINGS_KEY,
  DEFAULT_SETTINGS,
  EARLY_SESSION_WINDOW,
} from '../src/settings';

describe('SettingsStore', () => {
  it('کلید انحصاری، خارج از کلیدهای رزروشده‌ی قرارداد است', () => {
    const reserved = Object.values(STORAGE_KEYS) as string[];
    expect(reserved).not.toContain(AUDIO_SETTINGS_KEY);
    expect(AUDIO_SETTINGS_KEY).toBe('dor.audio.settings');
    // به‌خصوص dor.settings (مال app-shell) را لمس نمی‌کنیم
    expect(AUDIO_SETTINGS_KEY).not.toBe(STORAGE_KEYS.settings);
  });

  it('پیش‌فرض: SFX روشن، موسیقی خاموش', () => {
    const s = new SettingsStore(createMemoryStorage());
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
    expect(s.get().musicEnabled).toBe(false);
  });

  it('تغییرات ماندگارند (round-trip از storage)', () => {
    const storage = createMemoryStorage();
    const s1 = new SettingsStore(storage);
    s1.setSfxEnabled(false);
    s1.setMusicEnabled(true);
    const s2 = new SettingsStore(storage); // نمونه‌ی تازه = خواندن از storage
    expect(s2.get().sfxEnabled).toBe(false);
    expect(s2.get().musicEnabled).toBe(true);
  });

  it('داده‌ی ناقص storage با پیش‌فرض merge می‌شود', () => {
    const storage = createMemoryStorage();
    storage.set(AUDIO_SETTINGS_KEY, { musicEnabled: true });
    const s = new SettingsStore(storage);
    expect(s.get().musicEnabled).toBe(true);
    expect(s.get().sfxEnabled).toBe(true); // از پیش‌فرض
  });

  it('get کپی برمی‌گرداند (mutation بیرونی بی‌اثر)', () => {
    const s = new SettingsStore(createMemoryStorage());
    const snap = s.get();
    snap.sfxEnabled = false;
    expect(s.get().sfxEnabled).toBe(true);
  });
});

describe('حالت سکوت هوشمند (پنجره‌ی ۳ جلسه‌ی اول)', () => {
  it(`پنجره = ${EARLY_SESSION_WINDOW} جلسه`, () => {
    expect(EARLY_SESSION_WINDOW).toBe(3);
  });

  it('خاموش‌کردن صدا در جلسات اول ثبت می‌شود → soft-pedal پس از پنجره', () => {
    const storage = createMemoryStorage();
    const s = new SettingsStore(storage);
    s.markSessionStart(); // جلسه ۱
    s.setSfxEnabled(false); // کاربر خاموش کرد
    expect(s.shouldSoftPedalAudioUi()).toBe(false); // هنوز داخل پنجره
    s.markSessionStart(); // جلسه ۲
    s.markSessionStart(); // جلسه ۳
    expect(s.shouldSoftPedalAudioUi()).toBe(true); // احترام به ترجیح
  });

  it('کاربری که صدا را روشن نگه داشت soft-pedal نمی‌گیرد', () => {
    const s = new SettingsStore(createMemoryStorage());
    for (let i = 0; i < 5; i++) s.markSessionStart();
    expect(s.shouldSoftPedalAudioUi()).toBe(false);
  });

  it('خاموش‌کردن بعد از پنجره‌ی اولیه، earlyMute حساب نمی‌شود', () => {
    const s = new SettingsStore(createMemoryStorage());
    for (let i = 0; i < 6; i++) s.markSessionStart(); // پنجره گذشت
    s.setSfxEnabled(false);
    expect(s.get().earlyMutes).toBe(0);
    expect(s.shouldSoftPedalAudioUi()).toBe(false);
  });

  it('toggle مکرر خاموش/روشن فقط گذار روشن→خاموش را می‌شمارد', () => {
    const s = new SettingsStore(createMemoryStorage());
    s.markSessionStart();
    s.setSfxEnabled(false);
    s.setSfxEnabled(false); // تکراری — نباید دوباره بشمارد
    expect(s.get().earlyMutes).toBe(1);
    s.setSfxEnabled(true);
    s.setSfxEnabled(false); // گذار جدید
    expect(s.get().earlyMutes).toBe(2);
  });
});
