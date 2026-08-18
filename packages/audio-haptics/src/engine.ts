/**
 * @dordaneh/audio-haptics — موتور Web Audio:
 * - AudioContext تنبل (پس از اولین ژست کاربر — سیاست autoplay مرورگر/WebView)
 * - بافرهای از-پیش-سنتزشده در init → پخش با latency < 50ms (فقط createBufferSource.start)
 * - پخش هم‌زمان چند نمونه بدون قطع‌شدن (هر play یک source تازه)
 * روی interface های حداقلی نوشته شده تا با mock تست‌پذیر باشد.
 * مالک: AI-13.
 */

import type { SfxName } from '@dordaneh/contracts';
import { SAMPLE_RATE } from './dsp';
import { renderSfx, renderMusicLoop, winJingle, streakLayersFor, ALL_SFX } from './sfx-defs';
import { Mixer, Throttle, pitchVariation, type GainNodeLike } from './mixer';

// ── interface های حداقلی Web Audio (سازگار با AudioContext واقعی) ──

export interface AudioBufferLike {
  copyToChannel?(source: Float32Array, channelNumber: number): void;
  getChannelData?(channel: number): Float32Array;
}

export interface BufferSourceLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  playbackRate: { value: number };
  connect(dest: unknown): unknown;
  start(when?: number): void;
  stop(when?: number): void;
  onended: (() => void) | null;
}

export interface EngineContextLike {
  currentTime: number;
  state?: string;
  destination: unknown;
  sampleRate?: number;
  createGain(): GainNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createBufferSource(): BufferSourceLike;
  resume?(): Promise<void>;
}

export type ContextFactory = () => EngineContextLike;

/** فکتوری پیش‌فرض: AudioContext مرورگر (با فالبک webkit). */
export function defaultContextFactory(): EngineContextLike {
  const g = globalThis as unknown as {
    AudioContext?: new (opts?: { latencyHint?: string }) => EngineContextLike;
    webkitAudioContext?: new () => EngineContextLike;
  };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) throw new Error('WEB_AUDIO_UNSUPPORTED');
  return new Ctor({ latencyHint: 'interactive' });
}

function toAudioBuffer(ctx: EngineContextLike, pcm: Float32Array): AudioBufferLike {
  const buf = ctx.createBuffer(1, pcm.length, ctx.sampleRate ?? SAMPLE_RATE);
  if (buf.copyToChannel) buf.copyToChannel(pcm, 0);
  else if (buf.getChannelData) buf.getChannelData(0).set(pcm);
  return buf;
}

export interface EngineOptions {
  contextFactory?: ContextFactory;
  /** rng تزریق‌پذیر برای pitch variation (تست قطعی). */
  rng?: () => number;
  /** ساعت میلی‌ثانیه برای throttle (تست قطعی). */
  nowMs?: () => number;
}

/** SFXهای پرتکرار که throttle و pitch variation می‌گیرند. */
const THROTTLED: ReadonlySet<SfxName> = new Set(['tap', 'flip']);
const PITCH_VARIED: ReadonlySet<SfxName> = new Set(['tap', 'flip', 'correct', 'present', 'absent']);

export class AudioEngine {
  private ctx: EngineContextLike | null = null;
  private mixer: Mixer | null = null;
  private buffers = new Map<string, AudioBufferLike>();
  private musicSource: BufferSourceLike | null = null;
  private tapThrottle: Throttle;
  private readonly rng: () => number;
  private readonly nowMs: () => number;
  private readonly makeCtx: ContextFactory;
  private unlocked = false;

  /** آخرین لایه‌ی استریک ذخیره‌شده — jingle مناسب را کش می‌کنیم. */
  private streakLayers = 0;

  constructor(opts: EngineOptions = {}) {
    this.makeCtx = opts.contextFactory ?? defaultContextFactory;
    this.rng = opts.rng ?? Math.random;
    this.nowMs = opts.nowMs ?? (() => Date.now());
    this.tapThrottle = new Throttle({ minIntervalMs: 33 });
  }

  /** آیا موتور آماده است (پس از اولین ژست کاربر)؟ */
  get ready(): boolean {
    return this.ctx !== null;
  }

  get mixerOrNull(): Mixer | null {
    return this.mixer;
  }

  /**
   * راه‌اندازی تنبل — باید داخل handler ژست کاربر صدا زده شود (tap اول).
   * همه‌ی بافرها همین‌جا سنتز و کش می‌شوند تا play بعدی زیر 50ms باشد.
   */
  unlock(): void {
    if (this.unlocked) {
      // resume برای حالتی که مرورگر context را suspend کرده
      if (this.ctx?.state === 'suspended') void this.ctx.resume?.();
      return;
    }
    let ctx: EngineContextLike;
    try {
      ctx = this.makeCtx();
    } catch {
      return; // محیط بدون Web Audio — silent degrade
    }
    this.ctx = ctx;
    this.mixer = new Mixer(ctx, ctx.destination);
    for (const name of ALL_SFX) {
      this.buffers.set(name, toAudioBuffer(ctx, renderSfx(name)));
    }
    this.buffers.set('music', toAudioBuffer(ctx, renderMusicLoop()));
    this.unlocked = true;
    if (ctx.state === 'suspended') void ctx.resume?.();
  }

  /**
   * به‌روزرسانی لایت‌موتیف استریک (Endowed Progress): جینگل win با لایه‌های
   * بیشتر برای استریک‌های ۷/۳۰/۱۰۰ روزه. meta-retention/app-shell صدا می‌زند.
   */
  setStreakDays(days: number): void {
    const layers = streakLayersFor(days);
    if (layers === this.streakLayers) return;
    this.streakLayers = layers;
    if (this.ctx) this.buffers.set('win', toAudioBuffer(this.ctx, winJingle(layers)));
  }

  /**
   * پخش یک SFX — hot path: فقط lookup کش + createBufferSource + start.
   * @param playbackRate ضریب اختیاری (برای «هارمونی ردیف حدس» از بیرون)
   */
  play(name: SfxName, playbackRate?: number): void {
    const ctx = this.ctx;
    const mixer = this.mixer;
    if (!ctx || !mixer || !mixer.sfxEnabled) return;
    if (THROTTLED.has(name) && !this.tapThrottle.allow(this.nowMs())) return;
    const buf = this.buffers.get(name);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = false;
    src.playbackRate.value =
      playbackRate ?? (PITCH_VARIED.has(name) ? pitchVariation(this.rng) : 1);
    src.connect(mixer.sfxBus);
    src.start(0);

    if (Mixer.shouldDuck(name)) mixer.duck();
  }

  /**
   * «هارمونی ردیف حدس»: کاشی درستِ iام در فلیپ، نت بعدی آرپژ شور را می‌نوازد.
   * پیاده‌سازی با playbackRate روی بافر correct (نسبت فرکانسی درجات آرپژ).
   */
  playArpeggioTile(tileIndex: number, ratios: readonly number[]): void {
    const r = ratios[Math.min(tileIndex, ratios.length - 1)] ?? 1;
    this.play('correct', r);
  }

  /** شروع/توقف لوپ سنتور (میکسر فید نمایی را انجام می‌دهد). */
  setMusicPlaying(on: boolean): void {
    const ctx = this.ctx;
    const mixer = this.mixer;
    if (!ctx || !mixer) return;
    mixer.setMusicEnabled(on);
    if (on && !this.musicSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers.get('music') ?? null;
      src.loop = true;
      src.connect(mixer.musicBus);
      src.start(0);
      this.musicSource = src;
    } else if (!on && this.musicSource) {
      const src = this.musicSource;
      this.musicSource = null;
      // پس از فید-اوت (۰.۸s میکسر) منبع را متوقف کن
      setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      }, 900);
    }
  }

  setSfxEnabled(on: boolean): void {
    this.mixer?.setSfxEnabled(on);
  }

  dispose(): void {
    this.mixer?.dispose();
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        /* noop */
      }
      this.musicSource = null;
    }
  }
}
