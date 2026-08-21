import { beforeEach, describe, expect, it } from 'vitest';
import { createEventBus, STORAGE_KEYS, type AppEvent } from '@dordaneh/contracts';
import { createShellStorage, type ShellStorage } from '../src/core/storage';
import { createOrchestrator, SHELL_KEYS } from '../src/services/orchestrator';
import { createServices, type ShellServices } from '../src/services/registry';
import { resetBusForTests, getBus } from '../src/core/bus';

function setup(): {
  bus: ReturnType<typeof createEventBus>;
  storage: ShellStorage;
  services: ShellServices;
  orch: ReturnType<typeof createOrchestrator>;
} {
  const bus = createEventBus();
  const storage = createShellStorage({});
  const services = createServices(bus, storage);
  const orch = createOrchestrator(bus, services, storage);
  return { bus, storage, services, orch };
}

describe('getBus — singleton', () => {
  beforeEach(() => resetBusForTests());
  it('یک نمونه‌ی واحد برمی‌گرداند', () => {
    expect(getBus()).toBe(getBus());
  });
});

describe('createServices — سوییچ mock', () => {
  it('با پکیج‌های خالی، همه mock هستند', () => {
    const { services } = setup();
    expect(services.mockFlags).toEqual({
      engine: true,
      culture: true,
      audio: true,
      analytics: true,
      monetization: true,
      share: true,
    });
  });
});

describe('Orchestrator — wiring آنالیتیکس (§8)', () => {
  it('هر رویداد قراردادی به AnalyticsApi.track می‌رسد (صف آفلاین)', () => {
    const { bus, storage } = setup();
    bus.emit({ type: 'screen_viewed', screen: '/' });
    bus.emit({ type: 'share_initiated', surface: 'result' });
    const queue = storage.get<AppEvent[]>(STORAGE_KEYS.analyticsQueue);
    expect(queue?.map((e) => e.type)).toEqual(['screen_viewed', 'share_initiated']);
  });

  it('dispose قطع اتصال می‌کند', () => {
    const { bus, storage, orch } = setup();
    orch.dispose();
    bus.emit({ type: 'screen_viewed', screen: '/x' });
    expect(storage.get(STORAGE_KEYS.analyticsQueue)).toBeNull();
  });
});

describe('Orchestrator — جریان پس از حل', () => {
  it('برد: culture_card → streak_update → share_prompt + بج آلبوم + card_revealed', () => {
    const { bus, services, storage, orch } = setup();
    // بازی تا برد
    const { puzzleId } = services.engine.getOnboardingPuzzle();
    services.engine.evaluateGuess(puzzleId, 'دردانه');

    const stepsSeen: string[][] = [];
    orch.onPostSolve((steps) => stepsSeen.push(steps.map((s) => s.step)));
    const revealed: string[] = [];
    bus.on('card_revealed', (e) => revealed.push(e.cardId));

    bus.emit({ type: 'puzzle_finished', puzzleId, won: true, guessCount: 1, durationMs: 100 });

    expect(stepsSeen[0]).toEqual(['culture_card', 'streak_update', 'share_prompt']);
    expect(revealed).toHaveLength(1);
    expect(orch.hasAlbumBadge()).toBe(true);
    expect(storage.get<string[]>(STORAGE_KEYS.album)).toHaveLength(1);
  });

  it('باخت: بدون کارت، فقط streak و share', () => {
    const { bus, orch } = setup();
    const stepsSeen: string[][] = [];
    orch.onPostSolve((steps) => stepsSeen.push(steps.map((s) => s.step)));
    bus.emit({ type: 'puzzle_finished', puzzleId: 'daily-9', won: false, guessCount: 6, durationMs: 100 });
    expect(stepsSeen[0]).toEqual(['streak_update', 'share_prompt']);
    expect(orch.hasAlbumBadge()).toBe(false);
  });

  it('کشف تکراری همان کارت، بج/آلبوم را دوباره ثبت نمی‌کند', () => {
    const { bus, services, storage, orch } = setup();
    const { puzzleId } = services.engine.getOnboardingPuzzle();
    services.engine.evaluateGuess(puzzleId, 'دردانه');
    bus.emit({ type: 'puzzle_finished', puzzleId, won: true, guessCount: 1, durationMs: 1 });
    orch.clearAlbumBadge();
    bus.emit({ type: 'puzzle_finished', puzzleId, won: true, guessCount: 1, durationMs: 1 });
    expect(storage.get<string[]>(STORAGE_KEYS.album)).toHaveLength(1);
    expect(orch.hasAlbumBadge()).toBe(false);
  });

  it('خطای callback مصرف‌کننده، بقیه را نمی‌شکند', () => {
    const { bus, orch } = setup();
    const seen: string[] = [];
    orch.onPostSolve(() => {
      throw new Error('boom');
    });
    orch.onPostSolve(() => seen.push('ok'));
    bus.emit({ type: 'puzzle_finished', puzzleId: 'daily-1', won: false, guessCount: 6, durationMs: 1 });
    expect(seen).toEqual(['ok']);
  });

  it('unsubscribe onPostSolve کار می‌کند', () => {
    const { bus, orch } = setup();
    const seen: string[] = [];
    const off = orch.onPostSolve(() => seen.push('x'));
    off();
    bus.emit({ type: 'puzzle_finished', puzzleId: 'daily-1', won: false, guessCount: 6, durationMs: 1 });
    expect(seen).toEqual([]);
  });
});

describe('Orchestrator — بازیابی جلسه', () => {
  it('puzzle_started جلسه را ثبت می‌کند؛ فقط با حدسِ ثبت‌شده resumable است', () => {
    const { bus, services, orch } = setup();
    const { puzzleId } = services.engine.getDailyPuzzle(3);
    bus.emit({ type: 'puzzle_started', puzzleId, mode: 'daily' });
    // هنوز حدسی نه → resumable نیست
    expect(orch.getResumableSession()).toBeNull();
    // یک حدس غلط
    services.engine.evaluateGuess(puzzleId, 'مهربان');
    const s = orch.getResumableSession();
    if (services.engine.getState(puzzleId).status === 'playing') {
      expect(s).toEqual({ puzzleId, route: '/' });
    }
  });

  it('mode=practice → route تمرین', () => {
    const { bus, services, orch } = setup();
    const { puzzleId } = services.engine.getPracticePuzzle(1, 7);
    bus.emit({ type: 'puzzle_started', puzzleId, mode: 'practice' });
    services.engine.evaluateGuess(puzzleId, 'کتاب');
    if (services.engine.getState(puzzleId).status === 'playing') {
      expect(orch.getResumableSession()?.route).toBe('/practice');
    }
  });

  it('puzzle_finished جلسه را پاک می‌کند', () => {
    const { bus, services, orch, storage } = setup();
    const { puzzleId } = services.engine.getDailyPuzzle(3);
    bus.emit({ type: 'puzzle_started', puzzleId, mode: 'daily' });
    bus.emit({ type: 'puzzle_finished', puzzleId, won: true, guessCount: 2, durationMs: 5 });
    expect(storage.get(SHELL_KEYS.session)).toBeNull();
    expect(orch.getResumableSession()).toBeNull();
  });
});

describe('Orchestrator — آنبوردینگ', () => {
  it('پیش‌فرض onboarded=false؛ mark → true', () => {
    const { orch } = setup();
    expect(orch.isOnboarded()).toBe(false);
    orch.markOnboarded();
    expect(orch.isOnboarded()).toBe(true);
  });
});
