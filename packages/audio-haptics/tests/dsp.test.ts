import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  clamp,
  centsToRatio,
  SHUR_CENTS,
  shurFreq,
  expDecay,
  attackDecay,
  render,
  mixBuffers,
  applyEdgeFades,
  santoorPluck,
  woodTick,
  flipWhoosh,
  softChime,
  softThud,
  confettiPop,
  SAMPLE_RATE,
} from '../src/dsp';

describe('mulberry32 (PRNG قطعی)', () => {
  it('با seed یکسان دنباله‌ی یکسان می‌دهد', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('خروجی در [0,1) است', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('seedهای متفاوت دنباله‌ی متفاوت می‌دهند', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('clamp / centsToRatio', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
  it('اکتاو = ۱۲۰۰ سنت = نسبت ۲', () => {
    expect(centsToRatio(1200)).toBeCloseTo(2, 10);
    expect(centsToRatio(0)).toBe(1);
    expect(centsToRatio(-1200)).toBeCloseTo(0.5, 10);
  });
});

describe('گام شور', () => {
  it('درجه‌ی دوم کُرن است (۱۵۰ سنت — ربع‌پرده)', () => {
    expect(SHUR_CENTS[1]).toBe(150);
  });
  it('درجه‌ی ۰ = تونیک؛ درجه‌ی ۷ = اکتاو', () => {
    expect(shurFreq(300, 0)).toBeCloseTo(300);
    expect(shurFreq(300, 7)).toBeCloseTo(600);
  });
  it('درجات منفی → اکتاو پایین', () => {
    expect(shurFreq(300, -7)).toBeCloseTo(150);
  });
  it('درجه‌ی بالای اکتاو ادامه‌ی گام است', () => {
    // درجه‌ی 8 = اکتاو + درجه‌ی 1 (150c)
    expect(shurFreq(300, 8)).toBeCloseTo(600 * centsToRatio(150));
  });
});

describe('پوش‌ها', () => {
  it('expDecay در t=0 برابر ۱ و نزولی است', () => {
    expect(expDecay(0, 0.1)).toBe(1);
    expect(expDecay(0.1, 0.1)).toBeLessThan(1);
    expect(expDecay(0.2, 0.1)).toBeLessThan(expDecay(0.1, 0.1));
  });
  it('attackDecay در آغاز صفر و بعد از اتک اوج می‌گیرد', () => {
    expect(attackDecay(0, 0.01, 0.1)).toBe(0);
    expect(attackDecay(0.01, 0.01, 0.1)).toBeCloseTo(1, 5);
  });
});

describe('render', () => {
  it('طول بافر = duration × sampleRate', () => {
    const buf = render({ duration: 0.5, sample: () => 0.1 }, 1000);
    expect(buf.length).toBe(500);
  });
  it('کلیپ به [-1..1]', () => {
    const buf = render({ duration: 0.01, sample: () => 5 }, 1000);
    expect(Math.max(...buf)).toBeLessThanOrEqual(1);
  });
});

describe('mixBuffers', () => {
  it('آفست‌ها را اعمال و بافرها را جمع می‌کند', () => {
    const a = new Float32Array([0.5, 0.5]);
    const out = mixBuffers(
      [
        { buf: a, at: 0 },
        { buf: a, at: 1 / 1000 },
      ],
      1000,
    );
    expect(out.length).toBe(3);
    expect(out[0]).toBeCloseTo(0.5);
    expect(out[1]).toBeCloseTo(1 * 0.99, 1); // جمع شد + نرمال‌سازی نرم
  });
  it('نرمال‌سازی نرم: peak از 0.99 عبور نمی‌کند', () => {
    const a = new Float32Array([1, 1]);
    const out = mixBuffers([{ buf: a, at: 0 }, { buf: a, at: 0 }], 1000);
    expect(Math.max(...out)).toBeLessThanOrEqual(0.99 + 1e-6);
  });
  it('gain اعمال می‌شود', () => {
    const a = new Float32Array([0.5]);
    const out = mixBuffers([{ buf: a, at: 0, gain: 0.5 }], 1000);
    expect(out[0]).toBeCloseTo(0.25);
  });
});

describe('applyEdgeFades', () => {
  it('لبه‌ها را به صفر می‌برد (لوپ بی‌درز)', () => {
    const buf = new Float32Array(1000).fill(1);
    applyEdgeFades(buf, 0.1, 1000); // 100 نمونه فید
    expect(buf[0]).toBe(0);
    expect(buf[999]).toBe(0);
    expect(buf[500]).toBe(1);
  });
});

describe('سازهای سنتزی — خروجی معتبر و قطعی', () => {
  const specs = {
    santoorPluck: santoorPluck(293.66),
    woodTick: woodTick(),
    flipWhoosh: flipWhoosh(),
    softChime: softChime(400),
    softThud: softThud(),
    confettiPop: confettiPop(),
  };
  for (const [name, spec] of Object.entries(specs)) {
    it(`${name}: بافر غیرصفر، بدون NaN، در [-1..1]`, () => {
      const buf = render(spec, SAMPLE_RATE);
      expect(buf.length).toBeGreaterThan(0);
      let peak = 0;
      for (const v of buf) {
        expect(Number.isNaN(v)).toBe(false);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak).toBeGreaterThan(0.01); // واقعاً صدایی هست
      expect(peak).toBeLessThanOrEqual(1);
    });
  }
  it('سنتز قطعی است (دو رندر یکسان)', () => {
    const a = render(santoorPluck(300, 0.2, 5), 8000);
    const b = render(santoorPluck(300, 0.2, 5), 8000);
    expect(a).toEqual(b);
  });
});
