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
  /**
   * پس از ادغام کامل پکیج‌ها، هر لودر باید صفحه‌ی **واقعی** را برگرداند نه mock.
   * این تست هم پیاده‌سازی‌شدن صفحه‌ها را تضمین می‌کند و هم سالم‌بودن مکانیزم
   * resolve را (چون در نبود export، mock برمی‌گشت و تست fail می‌شد).
   */
  const cases: ReadonlyArray<readonly [string, () => Promise<unknown>, unknown, string]> = [
    ['GameScreen', loadGameScreen, MockGameScreen, '@dordaneh/game-board'],
    ['StatsScreen', loadStatsScreen, MockStatsScreen, '@dordaneh/meta-retention'],
    ['AlbumScreen', loadAlbumScreen, MockAlbumScreen, '@dordaneh/meta-retention'],
    ['DuelScreen', loadDuelScreen, MockDuelScreen, '@dordaneh/duel-mode'],
    ['ShopScreen', loadShopScreen, MockShopScreen, 'آداپتور @dordaneh/monetization'],
  ];

  for (const [name, load, mock, source] of cases) {
    it(`${name} واقعی از ${source} لود می‌شود (نه mock)`, async () => {
      const comp = await load();
      expect(typeof comp).toBe('function');
      expect(comp).not.toBe(mock);
    });
  }
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
