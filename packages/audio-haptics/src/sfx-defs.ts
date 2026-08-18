/**
 * @dordaneh/audio-haptics — تعریف قطعی هر ۱۰ SFX قرارداد (بخش ۹) + موسیقی سنتور.
 * شخصیت صوتی برند: کلیک‌های نرم چوبی/کاغذی، جینگل شور (سنتورگون)، باخت ملایم.
 * همه‌چیز سنتزی و قطعی است → صفر asset خارجی، صفر مسئله‌ی لایسنس، حجم ≈ صفر.
 * مالک: AI-13.
 */

import type { SfxName } from '@dordaneh/contracts';
import {
  SAMPLE_RATE,
  type RenderSpec,
  render,
  mixBuffers,
  applyEdgeFades,
  santoorPluck,
  woodTick,
  flipWhoosh,
  softChime,
  softThud,
  confettiPop,
  shurFreq,
  expDecay,
  attackDecay,
  mulberry32,
} from './dsp';

/** تونیک برند: A4×2/3 ≈ ر (D4-ish) — گرم و میانه، مناسب اسپیکر موبایل. */
export const BRAND_ROOT = 293.66;

/** آرپژ بالارونده‌ی «هارمونی ردیف حدس»: درجات شور برای کاشی‌های درست ردیف. */
export const ARPEGGIO_DEGREES = [0, 2, 4, 5, 7, 9] as const; // تا ۶ کاشی

/** فرکانس نت آرپژ برای کاشی iام (۰-مبنا) — game-board در فلیپ صدا می‌زند. */
export function arpeggioFreq(tileIndex: number): number {
  const d = ARPEGGIO_DEGREES[Math.min(tileIndex, ARPEGGIO_DEGREES.length - 1)] ?? 0;
  return shurFreq(BRAND_ROOT, d);
}

function jingleNotes(degrees: number[], step: number, noteDur: number, gain = 0.9) {
  return degrees.map((deg, i) => ({
    buf: render(santoorPluck(shurFreq(BRAND_ROOT, deg), noteDur, 40 + i)),
    at: i * step,
    gain,
  }));
}

/** جینگل پیروزی پایه (~1.6s): تترا‌کورد شور بالارونده + اکتاو — سنتورگون. */
export function winJingle(streakLayers = 0): Float32Array {
  const parts = jingleNotes([0, 2, 4, 7], 0.14, 1.1);
  // پایان: آکورد باز (تونیک+پنجم+اکتاو) — حل موسیقایی (Huron 2006)
  const endAt = 4 * 0.14 + 0.05;
  for (const deg of [0, 4, 7]) {
    parts.push({ buf: render(santoorPluck(shurFreq(BRAND_ROOT, deg), 1.3, 60 + deg)), at: endAt, gain: 0.65 });
  }
  // لایت‌موتیف استریک (Endowed Progress): هر لایه یک تزئین می‌افزاید.
  if (streakLayers >= 1) {
    // لایه ۱ (استریک ≥۷): ریزِ سنتور روی درجه‌ی بالا
    for (let i = 0; i < 3; i++) {
      parts.push({ buf: render(santoorPluck(shurFreq(BRAND_ROOT, 9), 0.5, 80 + i)), at: endAt + 0.12 + i * 0.07, gain: 0.35 });
    }
  }
  if (streakLayers >= 2) {
    // لایه ۲ (استریک ≥۳۰): باس اکتاو پایین
    parts.push({ buf: render(santoorPluck(BRAND_ROOT / 2, 1.6, 90)), at: 0, gain: 0.5 });
  }
  if (streakLayers >= 3) {
    // لایه ۳ (استریک ≥۱۰۰): زنگ طلایی بالای آکورد پایانی
    parts.push({ buf: render(softChime(shurFreq(BRAND_ROOT, 14), 1.0, 0.35)), at: endAt + 0.05, gain: 0.4 });
  }
  return mixBuffers(parts);
}

/** نگاشت آستانه‌ی استریک → تعداد لایه‌ی جینگل. */
export function streakLayersFor(streakDays: number): number {
  if (streakDays >= 100) return 3;
  if (streakDays >= 30) return 2;
  if (streakDays >= 7) return 1;
  return 0;
}

function renderSpec(spec: RenderSpec): Float32Array {
  return render(spec);
}

/** رندر بافر PCM مونو برای هر SfxName — قطعی و بدون Web Audio (تست‌پذیر در Node). */
export function renderSfx(name: SfxName): Float32Array {
  switch (name) {
    case 'tap':
      return renderSpec(woodTick());
    case 'flip':
      return renderSpec(flipWhoosh());
    case 'correct':
      // زنگ گرم روی تونیک — نت واقعی آرپژ را میکسر با playbackRate تنظیم می‌کند
      return renderSpec(softChime(shurFreq(BRAND_ROOT, 4), 0.32, 0.3));
    case 'present':
      // کهربایی: درجه‌ی کُرن شور (150c) — «نزدیکی» را می‌گوید نه خطا
      return renderSpec(softChime(shurFreq(BRAND_ROOT, 1), 0.26, 0.18));
    case 'absent':
      return renderSpec(softThud());
    case 'win':
      return winJingle(0);
    case 'lose':
      // دو نت پایین‌رونده‌ی ملایم شور — همدلانه، بدون تحقیر
      return mixBuffers([
        { buf: render(santoorPluck(shurFreq(BRAND_ROOT, 2), 0.9, 71)), at: 0, gain: 0.6 },
        { buf: render(santoorPluck(shurFreq(BRAND_ROOT, 0), 1.2, 72)), at: 0.22, gain: 0.6 },
      ]);
    case 'streak': {
      // شمارش شعله: سه تیک چوبی بالارونده + زنگ کوتاه
      const parts = [0, 1, 2].map((i) => ({
        buf: render(woodTick(1400 + i * 350, 0.07, 30 + i)),
        at: i * 0.09,
        gain: 0.8,
      }));
      parts.push({ buf: render(softChime(shurFreq(BRAND_ROOT, 7), 0.4, 0.25)), at: 0.28, gain: 0.55 });
      return mixBuffers(parts);
    }
    case 'card_reveal': {
      // کشف گنجینه: گلیس کوتاه سنتور (سه نت سریع) + هوای کاغذی
      const parts = [0, 4, 7].map((deg, i) => ({
        buf: render(santoorPluck(shurFreq(BRAND_ROOT * 2, deg), 0.8, 50 + i)),
        at: i * 0.06,
        gain: 0.45,
      }));
      parts.push({ buf: render(flipWhoosh(0.2, 13)), at: 0, gain: 0.5 });
      return mixBuffers(parts);
    }
    case 'confetti':
      return renderSpec(confettiPop());
  }
}

/** فهرست کامل برای ابزار تولید/تست بودجه. */
export const ALL_SFX: readonly SfxName[] = [
  'tap',
  'flip',
  'correct',
  'present',
  'absent',
  'win',
  'lose',
  'streak',
  'card_reveal',
  'confetti',
] as const;

/**
 * لوپ سنتور پس‌زمینه (~32s): الگوی آرام مضراب روی شور، قطعی، بدون درز.
 * پیش‌فرض خاموش (RED LINE هویت بصری/صوتی: «سنتور ملایمِ اختیاری»).
 */
export function renderMusicLoop(durationSec = 32): Float32Array {
  const rnd = mulberry32(1404);
  const parts: { buf: Float32Array; at: number; gain: number }[] = [];
  // پیشروی ملودیک آرام: گردش روی درجات شور با ریتم تنفس‌دار
  const phrase = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 7, 5, 4, 2, 0];
  const beat = durationSec / (phrase.length * 2);
  for (let rep = 0; rep < 2; rep++) {
    for (let i = 0; i < phrase.length; i++) {
      const at = (rep * phrase.length + i) * beat + rnd() * 0.02;
      const deg = phrase[i] ?? 0;
      parts.push({
        buf: render(santoorPluck(shurFreq(BRAND_ROOT, deg), 1.8, 100 + rep * 16 + i)),
        at,
        gain: 0.28 + rnd() * 0.06,
      });
      // پداल تونیک هر ۴ ضرب — سکون مُدال
      if (i % 4 === 0) {
        parts.push({
          buf: render(santoorPluck(BRAND_ROOT / 2, 2.4, 200 + i)),
          at,
          gain: 0.14,
        });
      }
    }
  }
  const buf = mixBuffers(parts);
  // برش دقیق به طول لوپ + فید لبه برای بی‌درزی
  const n = Math.round(durationSec * SAMPLE_RATE);
  const out = buf.length >= n ? buf.slice(0, n) : (() => { const o = new Float32Array(n); o.set(buf); return o; })();
  applyEdgeFades(out, 0.8);
  return out;
}

// re-export برای مصرف داخلی موتور
export { expDecay, attackDecay };
