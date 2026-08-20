import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Mixer, Throttle, pitchVariation, expFade, EPS, DUCKING_SFX } from '../src/mixer';
import { MockContext, MockGain, MockParam } from './mocks';

describe('expFade', () => {
  it('رمپ نمایی (نه خطی) زمان‌بندی می‌کند و هرگز صفر مطلق نمی‌گذارد', () => {
    const p = new MockParam(1);
    expFade(p, 10, 0, 0.5);
    const ramp = p.events.find((e) => e.kind === 'expRamp');
    expect(ramp?.value).toBe(EPS); // صفر → EPS
    expect(ramp?.time).toBeCloseTo(10.5);
    expect(p.events[0]?.kind).toBe('cancel'); // اول cancel
  });
  it('از مقدار فعلی شروع می‌کند (بدون پرش)', () => {
    const p = new MockParam(0.7);
    expFade(p, 0, 0.2, 0.1);
    const set = p.events.find((e) => e.kind === 'set');
    expect(set?.value).toBe(0.7);
  });
});

describe('Throttle (ضد-spam برای tap)', () => {
  it('پخش‌های سریع‌تر از minInterval را رد می‌کند', () => {
    const t = new Throttle({ minIntervalMs: 33 });
    expect(t.allow(0)).toBe(true);
    expect(t.allow(10)).toBe(false);
    expect(t.allow(32)).toBe(false);
    expect(t.allow(34)).toBe(true);
  });
});

describe('pitchVariation (±۵٪)', () => {
  it('در بازه‌ی [0.95, 1.05] می‌ماند', () => {
    for (let i = 0; i < 200; i++) {
      const v = pitchVariation(Math.random);
      expect(v).toBeGreaterThanOrEqual(0.95);
      expect(v).toBeLessThanOrEqual(1.05);
    }
  });
  it('قطعی با rng تزریقی', () => {
    expect(pitchVariation(() => 0.5)).toBe(1); // وسط بازه
    expect(pitchVariation(() => 1)).toBeCloseTo(1.05);
    expect(pitchVariation(() => 0)).toBeCloseTo(0.95);
  });
});

describe('Mixer', () => {
  let ctx: MockContext;
  let mixer: Mixer;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = new MockContext();
    mixer = new Mixer(ctx, ctx.destination);
  });
  afterEach(() => {
    mixer.dispose();
    vi.useRealTimers();
  });

  it('دو باس مستقل می‌سازد و به مقصد وصل می‌کند', () => {
    expect(ctx.gains.length).toBe(2);
    expect((mixer.sfxBus as MockGain).connectedTo).toContain(ctx.destination);
    expect((mixer.musicBus as MockGain).connectedTo).toContain(ctx.destination);
  });

  it('پیش‌فرض: SFX روشن، موسیقی خاموش (سند راهبردی)', () => {
    expect(mixer.sfxEnabled).toBe(true);
    expect(mixer.musicEnabled).toBe(false);
    expect((mixer.musicBus as MockGain).gain.value).toBe(EPS);
  });

  it('setSfxEnabled(false) بهره را به EPS فید می‌کند', () => {
    mixer.setSfxEnabled(false);
    expect(mixer.sfxEnabled).toBe(false);
    expect((mixer.sfxBus as MockGain).gain.value).toBe(EPS);
  });

  it('setMusicEnabled(true) فید-این نمایی به بهره‌ی پایه', () => {
    mixer.setMusicEnabled(true);
    const g = (mixer.musicBus as MockGain).gain;
    expect(g.value).toBeCloseTo(0.35);
    expect(g.events.some((e) => e.kind === 'expRamp')).toBe(true);
  });

  it('duck: موسیقی ۵۰٪ کم و پس از hold برمی‌گردد', () => {
    mixer.setMusicEnabled(true);
    mixer.duck(1200);
    const g = (mixer.musicBus as MockGain).gain;
    expect(g.value).toBeCloseTo(0.35 * 0.5);
    vi.advanceTimersByTime(1300);
    expect(g.value).toBeCloseTo(0.35);
  });

  it('duck وقتی موسیقی خاموش است هیچ کاری نمی‌کند', () => {
    const g = (mixer.musicBus as MockGain).gain;
    const before = g.events.length;
    mixer.duck();
    expect(g.events.length).toBe(before);
  });

  it('duckهای هم‌پوشان تایمر را reset می‌کنند', () => {
    mixer.setMusicEnabled(true);
    mixer.duck(1000);
    vi.advanceTimersByTime(600);
    mixer.duck(1000); // reset
    vi.advanceTimersByTime(600);
    const g = (mixer.musicBus as MockGain).gain;
    expect(g.value).toBeCloseTo(0.35 * 0.5); // هنوز duck
    vi.advanceTimersByTime(500);
    expect(g.value).toBeCloseTo(0.35); // حالا برگشت
  });

  it('اگر حین duck موسیقی خاموش شود، بازگشتی رخ نمی‌دهد', () => {
    mixer.setMusicEnabled(true);
    mixer.duck(500);
    mixer.setMusicEnabled(false);
    vi.advanceTimersByTime(600);
    expect((mixer.musicBus as MockGain).gain.value).toBe(EPS);
  });

  it('shouldDuck فقط برای SFXهای مهم', () => {
    expect(Mixer.shouldDuck('win')).toBe(true);
    expect(Mixer.shouldDuck('lose')).toBe(true);
    expect(Mixer.shouldDuck('tap')).toBe(false);
    expect(DUCKING_SFX.has('card_reveal')).toBe(true);
  });
});
