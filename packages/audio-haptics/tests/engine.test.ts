import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../src/engine';
import { ALL_SFX } from '../src/sfx-defs';
import { MockContext, MockGain, MockSource } from './mocks';

function makeEngine(ctx: MockContext, nowMs?: () => number): AudioEngine {
  return new AudioEngine({
    contextFactory: () => ctx,
    rng: () => 0.5, // pitch = 1 (قطعی)
    nowMs: nowMs ?? (() => 0),
  });
}

describe('AudioEngine — راه‌اندازی تنبل', () => {
  it('قبل از unlock هیچ context ساخته نمی‌شود و play بی‌خطر است', () => {
    const factory = vi.fn(() => new MockContext());
    const e = new AudioEngine({ contextFactory: factory });
    expect(e.ready).toBe(false);
    expect(() => e.play('tap')).not.toThrow(); // silent — قبل از ژست کاربر
    expect(factory).not.toHaveBeenCalled();
  });

  it('unlock همه‌ی بافرها را از پیش می‌سازد (کلید latency < 50ms)', () => {
    const ctx = new MockContext();
    const e = makeEngine(ctx);
    e.unlock();
    expect(e.ready).toBe(true);
    // ۱۰ SFX + ۱ موسیقی
    expect(ctx.buffersCreated).toBe(ALL_SFX.length + 1);
  });

  it('unlock تکراری context جدید نمی‌سازد؛ suspended را resume می‌کند', () => {
    const ctx = new MockContext();
    const factory = vi.fn(() => ctx);
    const e = new AudioEngine({ contextFactory: factory });
    e.unlock();
    ctx.state = 'suspended';
    e.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.resumed).toBeGreaterThanOrEqual(1);
  });

  it('محیط بدون Web Audio → silent degrade', () => {
    const e = new AudioEngine({
      contextFactory: () => {
        throw new Error('WEB_AUDIO_UNSUPPORTED');
      },
    });
    expect(() => e.unlock()).not.toThrow();
    expect(e.ready).toBe(false);
    expect(() => e.play('win')).not.toThrow();
  });
});

describe('AudioEngine — پخش (hot path)', () => {
  let ctx: MockContext;
  let e: AudioEngine;
  let now = 0;

  beforeEach(() => {
    ctx = new MockContext();
    now = 0;
    e = makeEngine(ctx, () => now);
    e.unlock();
  });

  it('play هر ۱۰ SFX یک source تازه می‌سازد و start می‌کند', () => {
    let t = 0;
    for (const name of ALL_SFX) {
      now = t += 100; // فاصله‌ی کافی برای throttle
      e.play(name);
    }
    expect(ctx.sources.filter((s) => s.started).length).toBe(ALL_SFX.length);
  });

  it('پخش هم‌زمان چندنمونه بدون قطع‌شدن (sourceهای مستقل)', () => {
    e.play('win');
    e.play('confetti');
    e.play('card_reveal');
    const started = ctx.sources.filter((s) => s.started);
    expect(started.length).toBe(3);
    expect(started.every((s) => !s.stopped)).toBe(true);
  });

  it('tap با throttle: دو tap در ۱۰ms → فقط یکی', () => {
    now = 1000;
    e.play('tap');
    now = 1010;
    e.play('tap');
    expect(ctx.sources.filter((s) => s.started).length).toBe(1);
    now = 1100;
    e.play('tap');
    expect(ctx.sources.filter((s) => s.started).length).toBe(2);
  });

  it('pitch variation فقط روی SFXهای تعریف‌شده (rng=0.5 → rate=1)', () => {
    e.play('tap');
    const src = ctx.sources.find((s) => s.started);
    expect(src?.playbackRate.value).toBe(1);
    e.play('win'); // win نباید vary شود
    const winSrc = ctx.sources.filter((s) => s.started)[1];
    expect(winSrc?.playbackRate.value).toBe(1);
  });

  it('play با playbackRate صریح (آرپژ) rate را ست می‌کند', () => {
    e.play('correct', 1.25);
    const src = ctx.sources.find((s) => s.started);
    expect(src?.playbackRate.value).toBe(1.25);
  });

  it('playArpeggioTile نسبت درجه‌ی کاشی را اعمال می‌کند و از انتها clamp', () => {
    const ratios = [1, 1.2, 1.4] as const;
    e.playArpeggioTile(1, ratios);
    expect(ctx.sources.filter((s) => s.started)[0]?.playbackRate.value).toBe(1.2);
    e.playArpeggioTile(99, ratios); // خارج از بازه → آخرین
    expect(ctx.sources.filter((s) => s.started)[1]?.playbackRate.value).toBe(1.4);
  });

  it('SFX خاموش → پخش نمی‌شود', () => {
    e.setSfxEnabled(false);
    e.play('win');
    expect(ctx.sources.filter((s) => s.started).length).toBe(0);
  });

  it('win موسیقیِ روشن را duck می‌کند (۵۰٪) و tap نمی‌کند', () => {
    vi.useFakeTimers();
    e.setMusicPlaying(true);
    const musicGain = (e.mixerOrNull?.musicBus as MockGain).gain;
    const base = musicGain.value;
    now = 0;
    e.play('tap');
    expect(musicGain.value).toBe(base); // tap → بدون duck
    e.play('win');
    expect(musicGain.value).toBeCloseTo(base * 0.5); // duck ۵۰٪
    vi.advanceTimersByTime(2000);
    expect(musicGain.value).toBeCloseTo(base); // بازگشت نرم
    vi.useRealTimers();
  });
});

describe('AudioEngine — موسیقی و استریک', () => {
  let ctx: MockContext;
  let e: AudioEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = new MockContext();
    e = makeEngine(ctx);
    e.unlock();
  });
  afterEach(() => {
    e.dispose();
    vi.useRealTimers();
  });

  it('setMusicPlaying(true) یک source لوپ می‌سازد', () => {
    e.setMusicPlaying(true);
    const loop = ctx.sources.find((s) => s.loop);
    expect(loop?.started).toBe(true);
    // تکرار روشن‌کردن source دوم نمی‌سازد
    e.setMusicPlaying(true);
    expect(ctx.sources.filter((s) => s.loop).length).toBe(1);
  });

  it('setMusicPlaying(false) پس از فید-اوت source را stop می‌کند', () => {
    e.setMusicPlaying(true);
    const loop = ctx.sources.find((s) => s.loop) as MockSource;
    e.setMusicPlaying(false);
    expect(loop.stopped).toBe(false); // هنوز در حال فید نمایی
    vi.advanceTimersByTime(1000);
    expect(loop.stopped).toBe(true);
  });

  it('setStreakDays جینگل win را فقط در عبور از آستانه بازسازی می‌کند', () => {
    const before = ctx.buffersCreated;
    e.setStreakDays(3); // زیر آستانه → لایه ۰ (بدون تغییر)
    expect(ctx.buffersCreated).toBe(before);
    e.setStreakDays(7); // لایه ۱
    expect(ctx.buffersCreated).toBe(before + 1);
    e.setStreakDays(10); // هنوز لایه ۱ → بدون بازسازی
    expect(ctx.buffersCreated).toBe(before + 1);
    e.setStreakDays(30); // لایه ۲
    expect(ctx.buffersCreated).toBe(before + 2);
    e.setStreakDays(100); // لایه ۳
    expect(ctx.buffersCreated).toBe(before + 3);
  });

  it('قبل از unlock: setStreakDays فقط state را نگه می‌دارد (بی‌خطا)', () => {
    const e2 = new AudioEngine({ contextFactory: () => new MockContext() });
    expect(() => e2.setStreakDays(30)).not.toThrow();
  });

  it('dispose موسیقی را متوقف می‌کند', () => {
    e.setMusicPlaying(true);
    const loop = ctx.sources.find((s) => s.loop) as MockSource;
    e.dispose();
    expect(loop.stopped).toBe(true);
  });
});
