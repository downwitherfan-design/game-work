/**
 * @dordaneh/audio-haptics — میکسر: ducking، تنوع pitch، throttle ضد-spam،
 * منحنی‌های fade نمایی. روی interface های حداقلی Web Audio نوشته شده تا
 * با mock در Node تست‌پذیر باشد (پوشش ≥۸۰٪ بدون مرورگر).
 * مالک: AI-13.
 */

// ── interface های حداقلی (زیرمجموعه‌ی سازگار با Web Audio API) ──

export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, startTime: number): unknown;
  /** نمایی — هرگز به صفر مطلق نمی‌رسد؛ از EPS استفاده می‌کنیم. */
  exponentialRampToValueAtTime(value: number, endTime: number): unknown;
  cancelScheduledValues(startTime: number): unknown;
}

export interface GainNodeLike {
  gain: AudioParamLike;
  connect(dest: unknown): unknown;
  disconnect?(): unknown;
}

export interface ContextLike {
  currentTime: number;
  createGain(): GainNodeLike;
}

/** صفر ادراکی برای رمپ نمایی (نمی‌تواند صفر واقعی باشد). */
export const EPS = 0.0001;

/** فید نمایی یک AudioParam به مقصد در بازه‌ی مشخص — گوش لگاریتمی است. */
export function expFade(
  param: AudioParamLike,
  now: number,
  target: number,
  seconds: number,
  from?: number,
): void {
  param.cancelScheduledValues(now);
  const start = Math.max(EPS, from ?? param.value);
  param.setValueAtTime(start, now);
  param.exponentialRampToValueAtTime(Math.max(EPS, target), now + Math.max(0.001, seconds));
}

// ── throttle ضد-spam برای tap ──

export interface ThrottleOptions {
  /** حداقل فاصله‌ی دو پخش متوالی (ms) — زیر آستانه‌ی ادراک ~۳۳ms. */
  minIntervalMs: number;
}

/** gate ساده: true = اجازه‌ی پخش. برای هر SFX پرتکرار یک نمونه بساز. */
export class Throttle {
  private last = -Infinity;
  constructor(private readonly opts: ThrottleOptions = { minIntervalMs: 33 }) {}
  allow(nowMs: number): boolean {
    if (nowMs - this.last < this.opts.minIntervalMs) return false;
    this.last = nowMs;
    return true;
  }
}

// ── تنوع pitch (تکنیک استاندارد game audio — Collins 2008) ──

/**
 * ضریب playbackRate تصادفی در بازه‌ی ±۵٪ (پیش‌فرض).
 * rng تزریق‌شدنی → تست قطعی.
 */
export function pitchVariation(rng: () => number = Math.random, spreadPct = 5): number {
  const s = spreadPct / 100;
  return 1 + (rng() * 2 - 1) * s;
}

// ── میکسر اصلی ──

export interface MixerOptions {
  /** بهره‌ی پایه‌ی SFX (0..1) */
  sfxGain?: number;
  /** بهره‌ی پایه‌ی موسیقی (0..1) */
  musicGain?: number;
  /** نسبت ducking موسیقی هنگام SFX مهم (0..1 از بهره‌ی پایه) */
  duckRatio?: number;
  /** زمان فرود ducking (s) */
  duckAttack?: number;
  /** زمان بازگشت ducking (s) */
  duckRelease?: number;
}

/** SFXهایی که موسیقی را ducking می‌کنند. */
export const DUCKING_SFX: ReadonlySet<string> = new Set(['win', 'lose', 'streak', 'card_reveal']);

/**
 * دو باس مستقل SFX/Music روی یک context. مصرف‌کننده منبع‌ها را به
 * `sfxBus`/`musicBus` وصل می‌کند؛ میکسر فقط بهره‌ها و ducking را اداره می‌کند.
 */
export class Mixer {
  readonly sfxBus: GainNodeLike;
  readonly musicBus: GainNodeLike;
  private readonly o: Required<MixerOptions>;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private sfxOn = true;
  private musicOn = false; // پیش‌فرض موسیقی خاموش (سند راهبردی)

  constructor(
    private readonly ctx: ContextLike,
    destination: unknown,
    opts: MixerOptions = {},
  ) {
    this.o = {
      sfxGain: opts.sfxGain ?? 0.9,
      musicGain: opts.musicGain ?? 0.35,
      duckRatio: opts.duckRatio ?? 0.5, // موسیقی ۵۰٪ کم می‌شود (قرارداد مأموریت)
      duckAttack: opts.duckAttack ?? 0.08,
      duckRelease: opts.duckRelease ?? 0.6,
    };
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.gain.value = this.o.sfxGain;
    this.musicBus.gain.value = EPS; // تا فعال‌شدن موسیقی، بی‌صدا
    this.sfxBus.connect(destination);
    this.musicBus.connect(destination);
  }

  get sfxEnabled(): boolean {
    return this.sfxOn;
  }
  get musicEnabled(): boolean {
    return this.musicOn;
  }

  setSfxEnabled(on: boolean): void {
    this.sfxOn = on;
    expFade(this.sfxBus.gain, this.ctx.currentTime, on ? this.o.sfxGain : EPS, 0.05);
  }

  /** فید-این/فید-اوت نرمِ نمایی موسیقی (الزام مأموریت). */
  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    expFade(this.musicBus.gain, this.ctx.currentTime, on ? this.o.musicGain : EPS, on ? 1.2 : 0.8);
  }

  /**
   * Ducking: موسیقی به duckRatio از بهره‌ی پایه فرود می‌آید و پس از
   * holdMs به‌نرمی برمی‌گردد. فراخوانی‌های هم‌پوشان، تایمر را reset می‌کنند.
   */
  duck(holdMs = 1200): void {
    if (!this.musicOn) return;
    const now = this.ctx.currentTime;
    expFade(this.musicBus.gain, now, this.o.musicGain * this.o.duckRatio, this.o.duckAttack);
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      this.duckTimer = null;
      if (this.musicOn) {
        expFade(this.musicBus.gain, this.ctx.currentTime, this.o.musicGain, this.o.duckRelease);
      }
    }, holdMs);
  }

  /** آیا این SFX باید موسیقی را duck کند؟ */
  static shouldDuck(name: string): boolean {
    return DUCKING_SFX.has(name);
  }

  dispose(): void {
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = null;
  }
}
