import { describe, it, expect } from 'vitest';
import type { SfxName } from '@dordaneh/contracts';
import {
  ALL_SFX,
  renderSfx,
  renderMusicLoop,
  winJingle,
  streakLayersFor,
  arpeggioFreq,
  ARPEGGIO_DEGREES,
  BRAND_ROOT,
} from '../src/sfx-defs';
import { SAMPLE_RATE } from '../src/dsp';

describe('ALL_SFX — پوشش کامل قرارداد §9', () => {
  it('دقیقاً ۱۰ نام قرارداد را دارد', () => {
    const contract: SfxName[] = [
      'tap', 'flip', 'correct', 'present', 'absent',
      'win', 'lose', 'streak', 'card_reveal', 'confetti',
    ];
    expect([...ALL_SFX].sort()).toEqual([...contract].sort());
  });
});

describe('renderSfx', () => {
  for (const name of ALL_SFX) {
    it(`'${name}': بافر معتبر، بدون NaN، طول منطقی`, () => {
      const buf = renderSfx(name);
      expect(buf.length).toBeGreaterThan(SAMPLE_RATE * 0.02); // ≥ 20ms
      expect(buf.length).toBeLessThan(SAMPLE_RATE * 4); // ≤ 4s (SFX کوتاه)
      let peak = 0;
      for (const v of buf) {
        expect(Number.isNaN(v)).toBe(false);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak).toBeGreaterThan(0.01);
      expect(peak).toBeLessThanOrEqual(1);
    });
  }

  it('tap خیلی کوتاه است (بازخورد فوری تایپ)', () => {
    expect(renderSfx('tap').length / SAMPLE_RATE).toBeLessThanOrEqual(0.12);
  });

  it('جینگل win در بازه‌ی ۱–۲ ثانیه است (الزام برند)', () => {
    const sec = renderSfx('win').length / SAMPLE_RATE;
    expect(sec).toBeGreaterThanOrEqual(1);
    expect(sec).toBeLessThanOrEqual(2.5);
  });

  it('قطعی است: دو رندر یکسان', () => {
    expect(renderSfx('win')).toEqual(renderSfx('win'));
    expect(renderSfx('tap')).toEqual(renderSfx('tap'));
  });
});

describe('لایت‌موتیف استریک (Endowed Progress)', () => {
  it('آستانه‌ها: ۷→۱، ۳۰→۲، ۱۰۰→۳ لایه', () => {
    expect(streakLayersFor(0)).toBe(0);
    expect(streakLayersFor(6)).toBe(0);
    expect(streakLayersFor(7)).toBe(1);
    expect(streakLayersFor(29)).toBe(1);
    expect(streakLayersFor(30)).toBe(2);
    expect(streakLayersFor(99)).toBe(2);
    expect(streakLayersFor(100)).toBe(3);
    expect(streakLayersFor(500)).toBe(3);
  });

  it('هر لایه جینگل را غنی‌تر می‌کند (انرژی صعودی)', () => {
    const energy = (buf: Float32Array) => {
      let s = 0;
      for (const v of buf) s += v * v;
      return s;
    };
    const e0 = energy(winJingle(0));
    const e1 = energy(winJingle(1));
    const e2 = energy(winJingle(2));
    const e3 = energy(winJingle(3));
    expect(e1).toBeGreaterThan(e0);
    expect(e2).toBeGreaterThan(e1);
    expect(e3).toBeGreaterThan(e2);
  });
});

describe('هارمونی ردیف حدس — آرپژ شور', () => {
  it('۶ درجه برای ۶ کاشی دارد', () => {
    expect(ARPEGGIO_DEGREES.length).toBe(6);
  });
  it('فرکانس‌ها اکیداً صعودی‌اند (آرپژ بالارونده)', () => {
    for (let i = 1; i < 6; i++) {
      expect(arpeggioFreq(i)).toBeGreaterThan(arpeggioFreq(i - 1));
    }
  });
  it('کاشی ۰ روی تونیک برند است', () => {
    expect(arpeggioFreq(0)).toBeCloseTo(BRAND_ROOT);
  });
  it('ایندکس خارج از بازه clamp می‌شود', () => {
    expect(arpeggioFreq(99)).toBe(arpeggioFreq(5));
  });
});

describe('لوپ سنتور پس‌زمینه', () => {
  it('طول دقیق ~۳۲s و لبه‌های صفر (لوپ بی‌درز)', () => {
    const buf = renderMusicLoop(32);
    expect(buf.length).toBe(32 * SAMPLE_RATE);
    expect(Math.abs(buf[0] ?? 1)).toBeLessThan(0.001);
    expect(Math.abs(buf[buf.length - 1] ?? 1)).toBeLessThan(0.001);
  });
  it('در بازه‌ی مجاز ۳۰–۶۰s قابل تولید است', () => {
    const buf = renderMusicLoop(40);
    expect(buf.length).toBe(40 * SAMPLE_RATE);
  });
  it('سطح ملایم دارد (پس‌زمینه، نه foreground)', () => {
    const buf = renderMusicLoop(32);
    let peak = 0;
    for (const v of buf) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(1);
    expect(peak).toBeGreaterThan(0.05);
  });
});
