import { describe, it, expect, vi } from 'vitest';
import type { AudioApi } from '@dordaneh/contracts';
import { createMemoryStorage } from '@dordaneh/contracts';
import { createAudio, ALL_SFX, AUDIO_SETTINGS_KEY } from '../src/index';
import { MockContext } from './mocks';

function make(overrides: Parameters<typeof createAudio>[0] = {}) {
  const ctx = new MockContext();
  const storage = overrides.storage ?? createMemoryStorage();
  const audio = createAudio({
    storage,
    globalRef: overrides.globalRef ?? {},
    engine: { contextFactory: () => ctx, rng: () => 0.5, nowMs: (() => { let t = 0; return () => (t += 100); })() },
  });
  return { audio, ctx, storage };
}

describe('createAudio — انطباق با قرارداد AudioApi (§9)', () => {
  it('همه‌ی متدهای قرارداد را دارد', () => {
    const { audio } = make();
    // بررسی تایپی: DordanehAudio باید AudioApi باشد
    const api: AudioApi = audio;
    expect(typeof api.play).toBe('function');
    expect(typeof api.setMusicEnabled).toBe('function');
    expect(typeof api.setSfxEnabled).toBe('function');
    expect(typeof api.haptic).toBe('function');
  });

  it('قبل از unlock هیچ متدی exception نمی‌دهد (سیاست autoplay)', () => {
    const { audio } = make();
    expect(() => {
      for (const n of ALL_SFX) audio.play(n);
      audio.haptic('light');
      audio.setSfxEnabled(true);
      audio.setMusicEnabled(false);
      audio.playTileNote(0);
      audio.setStreakDays(7);
    }).not.toThrow();
  });

  it('پس از unlock پخش کار می‌کند', () => {
    const { audio, ctx } = make();
    audio.unlock();
    audio.play('win');
    expect(ctx.sources.filter((s) => s.started).length).toBe(1);
  });

  it('تنظیمات ماندگار پس از unlock اعمال می‌شوند', () => {
    const storage = createMemoryStorage();
    storage.set(AUDIO_SETTINGS_KEY, { sfxEnabled: false, musicEnabled: true, earlyMutes: 0, sessions: 0 });
    const { audio, ctx } = make({ storage });
    audio.unlock();
    audio.play('win'); // SFX خاموش است
    expect(ctx.sources.filter((s) => s.started && !s.loop).length).toBe(0);
    // اما موسیقی از تنظیمات روشن شده
    expect(ctx.sources.some((s) => s.loop && s.started)).toBe(true);
  });

  it('setSfxEnabled/setMusicEnabled در storage ماندگار می‌شوند', () => {
    const storage = createMemoryStorage();
    const { audio } = make({ storage });
    audio.unlock();
    audio.setSfxEnabled(false);
    audio.setMusicEnabled(true);
    const saved = storage.get<{ sfxEnabled: boolean; musicEnabled: boolean }>(AUDIO_SETTINGS_KEY);
    expect(saved?.sfxEnabled).toBe(false);
    expect(saved?.musicEnabled).toBe(true);
    expect(audio.isSfxEnabled()).toBe(false);
    expect(audio.isMusicEnabled()).toBe(true);
  });

  it('playTileNote آرپژ بالارونده می‌سازد (نسبت‌های صعودی)', () => {
    const { audio, ctx } = make();
    audio.unlock();
    audio.playTileNote(0);
    audio.playTileNote(2);
    audio.playTileNote(5);
    const rates = ctx.sources.filter((s) => s.started).map((s) => s.playbackRate.value);
    expect(rates.length).toBe(3);
    expect(rates[1]).toBeGreaterThan(rates[0] ?? 0);
    expect(rates[2]).toBeGreaterThan(rates[1] ?? 0);
  });

  it('haptic به درایور وب می‌رسد و با SFX خاموش قطع می‌شود', () => {
    const vibrate = vi.fn(() => true);
    const { audio } = make({ globalRef: { navigator: { vibrate } } });
    audio.haptic('success');
    expect(vibrate).toHaveBeenCalledWith([15, 30, 40]);
    audio.setSfxEnabled(false);
    audio.haptic('light');
    expect(vibrate).toHaveBeenCalledTimes(1); // دیگر صدا زده نشد
  });

  it('حالت سکوت هوشمند از API قابل خواندن است', () => {
    const { audio } = make();
    audio.markSessionStart();
    audio.setSfxEnabled(false);
    audio.markSessionStart();
    audio.markSessionStart();
    expect(audio.shouldSoftPedalAudioUi()).toBe(true);
  });

  it('dispose بی‌خطا است', () => {
    const { audio } = make();
    audio.unlock();
    audio.setMusicEnabled(true);
    expect(() => audio.dispose()).not.toThrow();
  });
});
