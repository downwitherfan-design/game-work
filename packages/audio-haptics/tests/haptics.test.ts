import { describe, it, expect, vi } from 'vitest';
import {
  createHaptics,
  createWebDriver,
  createCapacitorDriver,
  NOOP_DRIVER,
  VIBRATION_PATTERNS,
  type GlobalLike,
} from '../src/haptics';

describe('VIBRATION_PATTERNS', () => {
  it('چهار الگوی متمایز دارد (light=10ms، success=[15,30,40])', () => {
    expect(VIBRATION_PATTERNS.light).toBe(10);
    expect(VIBRATION_PATTERNS.medium).toBe(25);
    expect(VIBRATION_PATTERNS.success).toEqual([15, 30, 40]);
    expect(VIBRATION_PATTERNS.error).toEqual([40, 60, 40]);
  });
});

describe('createWebDriver', () => {
  it('با navigator.vibrate الگوی درست می‌فرستد', () => {
    const vibrate = vi.fn(() => true);
    const d = createWebDriver({ navigator: { vibrate } });
    expect(d).not.toBeNull();
    d?.trigger('light');
    expect(vibrate).toHaveBeenCalledWith(10);
    d?.trigger('success');
    expect(vibrate).toHaveBeenCalledWith([15, 30, 40]);
  });
  it('بدون vibrate → null', () => {
    expect(createWebDriver({})).toBeNull();
    expect(createWebDriver({ navigator: {} })).toBeNull();
  });
  it('خطای vibrate را می‌بلعد (silent degrade)', () => {
    const d = createWebDriver({
      navigator: {
        vibrate: () => {
          throw new Error('boom');
        },
      },
    });
    expect(() => d?.trigger('error')).not.toThrow();
  });
});

describe('createCapacitorDriver (feature-detect در runtime)', () => {
  it('بدون Capacitor → null (وابستگی build-time نداریم)', () => {
    expect(createCapacitorDriver({})).toBeNull();
    expect(createCapacitorDriver({ Capacitor: {} })).toBeNull();
    expect(createCapacitorDriver({ Capacitor: { Plugins: {} } })).toBeNull();
  });
  it('light/medium → impact با style درست', () => {
    const impact = vi.fn();
    const g: GlobalLike = { Capacitor: { Plugins: { Haptics: { impact } } } };
    const d = createCapacitorDriver(g);
    d?.trigger('light');
    expect(impact).toHaveBeenCalledWith({ style: 'LIGHT' });
    d?.trigger('medium');
    expect(impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
  });
  it('success/error → notification با type درست', () => {
    const notification = vi.fn();
    const g: GlobalLike = { Capacitor: { Plugins: { Haptics: { notification } } } };
    const d = createCapacitorDriver(g);
    d?.trigger('success');
    expect(notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
    d?.trigger('error');
    expect(notification).toHaveBeenCalledWith({ type: 'ERROR' });
  });
  it('Promise ردشده‌ی پلاگین اپ را نمی‌شکند', async () => {
    const impact = vi.fn(() => Promise.reject(new Error('native fail')));
    const d = createCapacitorDriver({ Capacitor: { Plugins: { Haptics: { impact } } } });
    expect(() => d?.trigger('light')).not.toThrow();
    await Promise.resolve(); // اجازه بده rejection هندل شود
  });
});

describe('createHaptics (اولویت انتخاب)', () => {
  it('Capacitor بر وب مقدم است', () => {
    const impact = vi.fn();
    const vibrate = vi.fn(() => true);
    const d = createHaptics({
      navigator: { vibrate },
      Capacitor: { Plugins: { Haptics: { impact } } },
    });
    d.trigger('light');
    expect(impact).toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });
  it('بدون Capacitor → وب', () => {
    const vibrate = vi.fn(() => true);
    const d = createHaptics({ navigator: { vibrate } });
    d.trigger('medium');
    expect(vibrate).toHaveBeenCalledWith(25);
  });
  it('هیچ‌کدام → NOOP (بدون خطا)', () => {
    const d = createHaptics({});
    expect(d).toBe(NOOP_DRIVER);
    expect(() => d.trigger('success')).not.toThrow();
  });
});
