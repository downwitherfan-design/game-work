/**
 * @dordaneh/audio-haptics — DSP خالص (بدون DOM، بدون Web Audio).
 * همه‌ی صداهای دُردانه از همین توابع قطعی سنتز می‌شوند؛ هم در runtime
 * (بافرهای از-پیش-رندر → latency < 50ms) و هم در tools/generate-sfx.ts.
 * مالک: AI-13.
 */

export const SAMPLE_RATE = 44100;

/** PRNG قطعی (mulberry32) — برای بازتولیدپذیری کامل صداها. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** سنت → نسبت فرکانسی (ربع‌پرده‌های دستگاهی = مضارب ۵۰ سنت). */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

/**
 * گام «شور» (نزدیک‌ترین خویشاوند پنتاتونیکِ سنتور) بر حسب سنت از تونیک.
 * درجه‌ی دوم «کُرَن» (ربع‌پرده کم) ≈ 150 سنت — هویت مُدال ایرانی.
 * مرجع نظری: فرهت، *The Dastgah Concept in Persian Music* (1990).
 */
export const SHUR_CENTS = [0, 150, 300, 500, 700, 800, 1000, 1200] as const;

/** فرکانس درجه‌ی n از گام شور روی تونیک root (درجه می‌تواند منفی/بالای اکتاو باشد). */
export function shurFreq(root: number, degree: number): number {
  const n = SHUR_CENTS.length - 1; // 7 درجه در هر اکتاو
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  const cents = (SHUR_CENTS[idx] ?? 0) + oct * 1200;
  return root * centsToRatio(cents);
}

/** پوش نمایی (گوش لگاریتمی است — Collins, *Game Sound*, 2008). */
export function expDecay(t: number, tau: number): number {
  return Math.exp(-t / tau);
}

/** اتک خطی خیلی کوتاه + دیکی نمایی — کلیک‌های نرم بدون «تق» دیجیتال. */
export function attackDecay(t: number, attack: number, tau: number): number {
  const a = attack <= 0 ? 1 : clamp(t / attack, 0, 1);
  return a * expDecay(Math.max(0, t - attack), tau);
}

export interface RenderSpec {
  /** طول بر حسب ثانیه */
  duration: number;
  /** تابع نمونه‌ساز: زمان (ثانیه) → دامنه [-1..1] */
  sample: (t: number) => number;
}

/** رندر آفلاین یک Spec به Float32Array مونو. */
export function render(spec: RenderSpec, sampleRate: number = SAMPLE_RATE): Float32Array {
  const n = Math.max(1, Math.round(spec.duration * sampleRate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = clamp(spec.sample(i / sampleRate), -1, 1);
  }
  return out;
}

/** میکس چند بافر با آفست (ثانیه) — خروجی به طول لازم رشد می‌کند. */
export function mixBuffers(
  parts: { buf: Float32Array; at: number; gain?: number }[],
  sampleRate: number = SAMPLE_RATE,
): Float32Array {
  let total = 1;
  for (const p of parts) total = Math.max(total, Math.round(p.at * sampleRate) + p.buf.length);
  const out = new Float32Array(total);
  for (const p of parts) {
    const off = Math.round(p.at * sampleRate);
    const g = p.gain ?? 1;
    for (let i = 0; i < p.buf.length; i++) {
      const v = (out[off + i] ?? 0) + (p.buf[i] ?? 0) * g;
      out[off + i] = v;
    }
  }
  // نرمال‌سازی نرم برای جلوگیری از کلیپ
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i] ?? 0));
  if (peak > 0.99) {
    const k = 0.99 / peak;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * k;
  }
  return out;
}

/** فید-این/فید-اوت نمایی درجا (برای لوپ‌های بدون درز). */
export function applyEdgeFades(buf: Float32Array, fadeSec: number, sampleRate = SAMPLE_RATE): void {
  const n = Math.min(buf.length, Math.round(fadeSec * sampleRate));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    // منحنی توانی ≈ نمایی ادراکی
    const k = g * g;
    buf[i] = (buf[i] ?? 0) * k;
    const j = buf.length - 1 - i;
    buf[j] = (buf[j] ?? 0) * k;
  }
}

// ────────────────────────────────────────────────────────────────
// سازهای سنتزی
// ────────────────────────────────────────────────────────────────

/**
 * «سنتور» سنتزی: جمع پارشیل‌های اندکی ناهارمونیک + دو سیمِ کمی ناکوک
 * (کوروسِ طبیعی سنتور: هر نت چند سیم دارد) + ترنزینت مضراب چوبی.
 */
export function santoorPluck(freq: number, duration = 1.4, seed = 7): RenderSpec {
  const rnd = mulberry32(seed);
  const detune = 1 + (rnd() - 0.5) * 0.004; // سیم دوم ~±0.2%
  const partials = [
    { m: 1.0, a: 1.0, tau: duration * 0.45 },
    { m: 2.0, a: 0.45, tau: duration * 0.28 },
    { m: 2.98, a: 0.28, tau: duration * 0.2 },
    { m: 4.03, a: 0.14, tau: duration * 0.13 },
    { m: 5.1, a: 0.07, tau: duration * 0.09 },
  ];
  const phases = partials.map(() => rnd() * Math.PI * 2);
  return {
    duration,
    sample: (t) => {
      let s = 0;
      for (let i = 0; i < partials.length; i++) {
        const p = partials[i];
        if (!p) continue;
        const env = attackDecay(t, 0.002, p.tau);
        const w = 2 * Math.PI * freq * p.m;
        const ph = phases[i] ?? 0;
        s += p.a * env * (Math.sin(w * t + ph) + Math.sin(w * detune * t + ph)) * 0.5;
      }
      // ترنزینت مضراب: نویز باند-بالای خیلی کوتاه
      const hit = (rnd() * 2 - 1) * expDecay(t, 0.008) * 0.15;
      return (s * 0.55 + hit) * attackDecay(t, 0.001, duration * 0.6);
    },
  };
}

/** تیک چوبی/کاغذی نرم — برای tap (شخصیت برند: کلیک چوبی). */
export function woodTick(freq = 1900, duration = 0.07, seed = 3): RenderSpec {
  const rnd = mulberry32(seed);
  const phase = rnd() * Math.PI * 2;
  return {
    duration,
    sample: (t) => {
      const body = Math.sin(2 * Math.PI * freq * t + phase) * expDecay(t, 0.012);
      const knock = Math.sin(2 * Math.PI * freq * 0.4 * t) * expDecay(t, 0.02) * 0.6;
      const paper = (rnd() * 2 - 1) * expDecay(t, 0.004) * 0.25;
      return (body * 0.5 + knock * 0.4 + paper) * attackDecay(t, 0.0008, 0.03) * 0.9;
    },
  };
}

/** «فِلیپ» کاشی: سوئیپ کوتاه پایین→بالا با هوای کاغذی. */
export function flipWhoosh(duration = 0.16, seed = 11): RenderSpec {
  const rnd = mulberry32(seed);
  return {
    duration,
    sample: (t) => {
      const k = t / duration;
      const f = 500 + 1400 * k * k; // سوئیپ نمایی‌نما
      const tone = Math.sin(2 * Math.PI * f * t) * 0.35;
      const air = (rnd() * 2 - 1) * 0.3 * Math.sin(Math.PI * k); // نویز با پوش سینوسی
      return (tone + air) * attackDecay(t, 0.01, duration * 0.5);
    },
  };
}

/** نُت زنگی نرم (سینوس + هارمونیک سوم ملایم) برای بازخورد کاشی. */
export function softChime(freq: number, duration = 0.35, bright = 0.25): RenderSpec {
  return {
    duration,
    sample: (t) => {
      const env = attackDecay(t, 0.004, duration * 0.35);
      return (
        (Math.sin(2 * Math.PI * freq * t) + bright * Math.sin(2 * Math.PI * freq * 3.01 * t)) *
        env *
        0.5
      );
    },
  };
}

/** تام ملایمِ پایین‌رونده — برای absent/lose (بدون تحقیر). */
export function softThud(startFreq = 220, endFreq = 150, duration = 0.22): RenderSpec {
  return {
    duration,
    sample: (t) => {
      const k = t / duration;
      const f = startFreq + (endFreq - startFreq) * k;
      return Math.sin(2 * Math.PI * f * t) * attackDecay(t, 0.005, duration * 0.4) * 0.55;
    },
  };
}

/** شمعک/پاف کنفتی: نویز روشن + چند جرقه‌ی زنگی. */
export function confettiPop(duration = 0.5, seed = 21): RenderSpec {
  const rnd = mulberry32(seed);
  const sparks = Array.from({ length: 6 }, () => ({
    at: 0.03 + rnd() * 0.3,
    f: 1200 + rnd() * 2200,
    tau: 0.04 + rnd() * 0.05,
  }));
  return {
    duration,
    sample: (t) => {
      let s = (rnd() * 2 - 1) * expDecay(t, 0.05) * 0.5; // پاف
      for (const sp of sparks) {
        if (t >= sp.at) {
          const dt = t - sp.at;
          s += Math.sin(2 * Math.PI * sp.f * dt) * expDecay(dt, sp.tau) * 0.2;
        }
      }
      return s * attackDecay(t, 0.002, duration * 0.6);
    },
  };
}
