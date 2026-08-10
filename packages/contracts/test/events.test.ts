import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../src/events';
import type { AppEvent } from '../src/events';

describe('createEventBus', () => {
  it('delivers events to subscribers of the same type', () => {
    const bus = createEventBus();
    const seen: AppEvent[] = [];
    bus.on('puzzle_started', (e) => seen.push(e));
    bus.emit({ type: 'puzzle_started', puzzleId: 'daily-1', mode: 'daily' });
    expect(seen).toEqual([{ type: 'puzzle_started', puzzleId: 'daily-1', mode: 'daily' }]);
  });

  it('does not deliver events of other types', () => {
    const bus = createEventBus();
    const cb = vi.fn();
    bus.on('card_revealed', cb);
    bus.emit({ type: 'screen_viewed', screen: 'stats' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('is a no-op when emitting with no subscribers', () => {
    const bus = createEventBus();
    expect(() => bus.emit({ type: 'screen_viewed', screen: 'album' })).not.toThrow();
  });

  it('supports multiple subscribers on one type', () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('streak_changed', a);
    bus.on('streak_changed', b);
    bus.emit({ type: 'streak_changed', value: 3, frozen: false });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops delivery', () => {
    const bus = createEventBus();
    const cb = vi.fn();
    const off = bus.on('share_completed', cb);
    off();
    bus.emit({ type: 'share_completed', surface: 'result' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('a throwing listener does not break other listeners (fail-soft)', () => {
    const bus = createEventBus();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const good = vi.fn();
    bus.on('puzzle_finished', () => {
      throw new Error('boom');
    });
    bus.on('puzzle_finished', good);
    bus.emit({ type: 'puzzle_finished', puzzleId: 'daily-1', won: true, guessCount: 4, durationMs: 60000 });
    expect(good).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('narrows the event type for each subscription (compile-time contract)', () => {
    const bus = createEventBus();
    bus.on('reward_ad_requested', (e) => {
      // e.placement is narrowed to 'extra_guess' | 'hint'
      const p: 'extra_guess' | 'hint' = e.placement;
      expect(['extra_guess', 'hint']).toContain(p);
    });
    bus.emit({ type: 'reward_ad_requested', placement: 'hint' });
  });
});
