/**
 * @dordaneh/audio-haptics — بازخورد لمسی: وب (navigator.vibrate) +
 * آداپتور Capacitor پشت interface با feature-detect در runtime.
 * هیچ وابستگی build-time به Capacitor نیست (پلاگین را AI-14 نصب می‌کند).
 * مالک: AI-13.
 */

import type { HapticKind } from '@dordaneh/contracts';

/** الگوهای متمایز وب (ms) — کوتاه و «مهربان»، زیر آستانه‌ی مزاحمت. */
export const VIBRATION_PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 25,
  success: [15, 30, 40],
  error: [40, 60, 40],
};

/** نگاشت به سبک‌های Haptics کپسیتور. */
const CAP_IMPACT_STYLE: Record<'light' | 'medium', string> = {
  light: 'LIGHT',
  medium: 'MEDIUM',
};
const CAP_NOTIFICATION_TYPE: Record<'success' | 'error', string> = {
  success: 'SUCCESS',
  error: 'ERROR',
};

/** interface مقصد — پیاده‌سازی وب یا Capacitor پشت همین قرارداد داخلی. */
export interface HapticsDriver {
  trigger(kind: HapticKind): void;
}

// ── شکل حداقلی پلاگین Capacitor Haptics (فقط برای feature-detect) ──
interface CapHapticsPluginLike {
  impact?(opts: { style: string }): Promise<unknown> | unknown;
  notification?(opts: { type: string }): Promise<unknown> | unknown;
}

/** ریشه‌ی سراسری تزریق‌پذیر برای تست (به‌جای دسترسی مستقیم به window). */
export interface GlobalLike {
  navigator?: { vibrate?: (pattern: number | number[]) => boolean };
  Capacitor?: { Plugins?: { Haptics?: CapHapticsPluginLike } };
}

function swallow(p: unknown): void {
  // Promise رد‌شده نباید اپ را بشکند — هپتیک بازخورد لوکس است، نه حیاتی.
  if (p && typeof (p as Promise<unknown>).catch === 'function') {
    (p as Promise<unknown>).catch(() => undefined);
  }
}

/** درایور Capacitor — فقط اگر پلاگین در runtime حاضر باشد ساخته می‌شود. */
export function createCapacitorDriver(g: GlobalLike): HapticsDriver | null {
  const plugin = g.Capacitor?.Plugins?.Haptics;
  if (!plugin) return null;
  return {
    trigger(kind: HapticKind): void {
      try {
        if (kind === 'light' || kind === 'medium') {
          if (plugin.impact) swallow(plugin.impact({ style: CAP_IMPACT_STYLE[kind] }));
        } else {
          if (plugin.notification) swallow(plugin.notification({ type: CAP_NOTIFICATION_TYPE[kind] }));
        }
      } catch {
        /* silent degrade */
      }
    },
  };
}

/** درایور وب — navigator.vibrate (اندروید Chrome/WebView؛ iOS وب پشتیبانی ندارد). */
export function createWebDriver(g: GlobalLike): HapticsDriver | null {
  const vibrate = g.navigator?.vibrate;
  if (typeof vibrate !== 'function') return null;
  const nav = g.navigator as { vibrate: (p: number | number[]) => boolean };
  return {
    trigger(kind: HapticKind): void {
      try {
        nav.vibrate(VIBRATION_PATTERNS[kind]);
      } catch {
        /* silent degrade */
      }
    },
  };
}

/** درایور بی‌اثر — محیط بدون هیچ قابلیت لمسی (دسکتاپ/SSR). */
export const NOOP_DRIVER: HapticsDriver = { trigger: () => undefined };

/**
 * انتخاب بهترین درایور موجود: Capacitor → وب → noop.
 * تشخیص در لحظه‌ی ساخت انجام می‌شود؛ اگر پلاگین دیرتر تزریق شد،
 * createHaptics را دوباره صدا بزنید (app-shell پس از deviceready).
 */
export function createHaptics(g: GlobalLike = globalThis as GlobalLike): HapticsDriver {
  return createCapacitorDriver(g) ?? createWebDriver(g) ?? NOOP_DRIVER;
}
