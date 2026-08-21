import { describe, expect, it } from 'vitest';
import { createMockAudio } from '../src/mocks/mock-audio';
import { resolveAudio, resolveEngine } from '../src/mocks/adapters';

describe('mock صدا', () => {
  it('play و haptic لاگ می‌شوند', () => {
    const a = createMockAudio();
    a.play('tap');
    a.play('win');
    a.haptic('light');
    expect(a.log.played).toEqual(['tap', 'win']);
    expect(a.log.haptics).toEqual(['light']);
  });

  it('setSfxEnabled(false) صدا را قطع می‌کند اما هپتیک می‌ماند', () => {
    const a = createMockAudio();
    a.setSfxEnabled(false);
    a.play('tap');
    a.haptic('error');
    expect(a.log.played).toEqual([]);
    expect(a.log.haptics).toEqual(['error']);
  });

  it('setMusicEnabled بدون خطا صدا زده می‌شود', () => {
    const a = createMockAudio();
    expect(() => a.setMusicEnabled(true)).not.toThrow();
  });
});

describe('آداپتورهای real-or-mock', () => {
  it('تا وقتی پکیج‌های دیگران خالی‌اند، mock قراردادی برمی‌گردد', () => {
    const engine = resolveEngine();
    const audio = resolveAudio();
    // قرارداد EngineApi رعایت شده
    const daily = engine.getDailyPuzzle(1);
    expect(daily.wordLength).toBe(6);
    expect(typeof daily.puzzleId).toBe('string');
    // قرارداد AudioApi رعایت شده
    expect(() => audio.play('tap')).not.toThrow();
    expect(() => audio.haptic('light')).not.toThrow();
  });
});
