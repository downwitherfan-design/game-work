/**
 * Resolver صفحه‌ها (قرارداد §6): هر route با dynamic import از entry point
 * رسمی پکیج مالک، lazy-load می‌شود (کاهش بوت سرد — هدف < ۲s).
 * اگر کامپوننت صادراتی قرارداد هنوز موجود نیست → mock قراردادی داخلی.
 */
import type { ComponentType } from 'preact';
import {
  MockAlbumScreen,
  MockDuelScreen,
  MockGameScreen,
  MockShopScreen,
  MockStatsScreen,
} from '../mocks/screens.mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- کامپوننت‌های خارجی با props ناشناخته از پکیج‌های در حال ساخت
type AnyComponent = ComponentType<any>;

async function resolve(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
  fallback: AnyComponent,
): Promise<AnyComponent> {
  try {
    const mod = await loader();
    const c = mod[exportName];
    if (typeof c === 'function') return c as AnyComponent;
  } catch {
    // پکیج هنوز آماده نیست — mock
  }
  return fallback;
}

export const loadGameScreen = (): Promise<AnyComponent> =>
  resolve(() => import('@dordaneh/game-board'), 'GameScreen', MockGameScreen);

export const loadStatsScreen = (): Promise<AnyComponent> =>
  resolve(() => import('@dordaneh/meta-retention'), 'StatsScreen', MockStatsScreen);

export const loadAlbumScreen = (): Promise<AnyComponent> =>
  resolve(() => import('@dordaneh/meta-retention'), 'AlbumScreen', MockAlbumScreen);

export const loadDuelScreen = (): Promise<AnyComponent> =>
  resolve(() => import('@dordaneh/duel-mode'), 'DuelScreen', MockDuelScreen);

/**
 * فروشگاه: پکیج AI-11 به‌جای کامپوننت، `mountShopScreen(container, deps)` صادر
 * می‌کند؛ `ShopScreenAdapter` آن را به کامپوننت Preact تبدیل می‌کند و خودش
 * افت به mock را مدیریت می‌کند (اگر پکیج/export در دسترس نبود).
 */
export const loadShopScreen = (): Promise<AnyComponent> =>
  resolve(() => import('./shop-adapter'), 'ShopScreenAdapter', MockShopScreen);

/**
 * پیش‌بارگذاری هوشمند: پس از ورود به بازی روزانه، ماژول‌های stats/album
 * در idle لود شوند (Doherty 1982: ناوبری بعدی < 100ms).
 */
export function preloadSecondaryScreens(win: {
  requestIdleCallback?: (cb: () => void) => number;
  setTimeout: (cb: () => void, ms: number) => number;
}): void {
  const kick = (): void => {
    void loadStatsScreen();
    void loadAlbumScreen();
  };
  if (typeof win.requestIdleCallback === 'function') win.requestIdleCallback(kick);
  else win.setTimeout(kick, 1500);
}
