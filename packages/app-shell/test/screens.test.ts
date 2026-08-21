import { describe, expect, it, vi } from 'vitest';
import {
  loadAlbumScreen,
  loadDuelScreen,
  loadGameScreen,
  loadShopScreen,
  loadStatsScreen,
  preloadSecondaryScreens,
} from '../src/app/screens';
import {
  MockAlbumScreen,
  MockDuelScreen,
  MockGameScreen,
  MockShopScreen,
  MockStatsScreen,
} from '../src/mocks/screens.mock';

describe('screen resolver — سوییچ واقعی/mock (§6)', () => {
  it('پکیج‌های خالی → mock قراردادی', async () => {
    await expect(loadGameScreen()).resolves.toBe(MockGameScreen);
    await expect(loadStatsScreen()).resolves.toBe(MockStatsScreen);
    await expect(loadAlbumScreen()).resolves.toBe(MockAlbumScreen);
    await expect(loadDuelScreen()).resolves.toBe(MockDuelScreen);
    await expect(loadShopScreen()).resolves.toBe(MockShopScreen);
  });
});

describe('preloadSecondaryScreens — پیش‌بارگذاری idle', () => {
  it('با requestIdleCallback', () => {
    const ric = vi.fn((cb: () => void) => {
      cb();
      return 1;
    });
    const st = vi.fn();
    preloadSecondaryScreens({ requestIdleCallback: ric, setTimeout: st });
    expect(ric).toHaveBeenCalledOnce();
    expect(st).not.toHaveBeenCalled();
  });

  it('بدون requestIdleCallback → setTimeout فالبک', () => {
    const st = vi.fn((cb: () => void) => {
      cb();
      return 1;
    });
    preloadSecondaryScreens({ setTimeout: st });
    expect(st).toHaveBeenCalledOnce();
  });
});
