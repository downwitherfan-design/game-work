/**
 * StorageApi پوسته — پیاده‌سازی قرارداد §5 روی localStorage (وب) با آداپتور
 * آماده‌ی Capacitor Preferences (native). تشخیص محیط خودکار.
 *
 * نکته‌ی طراحی: قرارداد StorageApi همگام (sync) است اما Capacitor Preferences
 * ناهمگام. آداپتور native یک کش درون‌حافظه‌ای write-through نگه می‌دارد:
 * خواندن از کش (sync)، نوشتن هم در کش و هم fire-and-forget به Preferences.
 * برای پرشدن اولیه‌ی کش، hydrate() در بوت صدا زده می‌شود.
 */
import {
  createMemoryStorage,
  createWebStorage,
  type StorageApi,
} from '@dordaneh/contracts';

/** شکل حداقلی پلاگین Capacitor Preferences (بدون وابستگی به پکیج Capacitor) */
export interface CapacitorPreferencesLike {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
}

interface CapacitorGlobalLike {
  isNativePlatform?: () => boolean;
  Plugins?: { Preferences?: CapacitorPreferencesLike };
}

/** StorageApi با قابلیت hydrate برای آداپتورهای ناهمگام */
export interface ShellStorage extends StorageApi {
  /** پرکردن کش از منبع native — در وب بلافاصله resolve می‌شود */
  hydrate(): Promise<void>;
}

function withNoopHydrate(api: StorageApi): ShellStorage {
  return { ...api, hydrate: () => Promise.resolve() };
}

/** آداپتور Capacitor Preferences: کش sync + نوشتن write-through ناهمگام */
export function createCapacitorStorage(prefs: CapacitorPreferencesLike): ShellStorage {
  const cache = new Map<string, string>();
  return {
    get<T>(key: string): T | null {
      const raw = cache.get(key);
      if (raw === undefined) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set<T>(key: string, v: T): void {
      try {
        const raw = JSON.stringify(v);
        cache.set(key, raw);
        // fire-and-forget؛ خطای native هرگز اپ آفلاین-اول را نمی‌شکند
        void prefs.set({ key, value: raw }).catch(() => undefined);
      } catch {
        // silent degrade
      }
    },
    async hydrate(): Promise<void> {
      try {
        const { keys } = await prefs.keys();
        await Promise.all(
          keys.map(async (key) => {
            const { value } = await prefs.get({ key });
            if (value !== null && !cache.has(key)) cache.set(key, value);
          }),
        );
      } catch {
        // silent degrade — با کش خالی ادامه می‌دهیم
      }
    },
  };
}

/** خواندن Capacitor از محیط جهانی (در native توسط WebView تزریق می‌شود) */
function detectCapacitor(env: object): CapacitorGlobalLike | null {
  const cap = (env as { Capacitor?: CapacitorGlobalLike }).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return cap;
  }
  return null;
}

/**
 * ساخت StorageApi مناسب محیط:
 *  - native (Capacitor + پلاگین Preferences) → آداپتور Preferences
 *  - وب → localStorage (fail-soft طبق مرجع قرارداد)
 *  - محیط بدون localStorage (تست/SSR) → درون‌حافظه‌ای
 */
export function createShellStorage(env: object = globalThis): ShellStorage {
  const cap = detectCapacitor(env);
  const prefs = cap?.Plugins?.Preferences;
  if (prefs) return createCapacitorStorage(prefs);

  const ls = (env as { localStorage?: Storage }).localStorage;
  if (ls) {
    try {
      // Safari private mode ممکن است setItem را پرتاب کند — پیش‌آزمایی
      const probe = '__dor_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return withNoopHydrate(createWebStorage(ls));
    } catch {
      return withNoopHydrate(createMemoryStorage());
    }
  }
  return withNoopHydrate(createMemoryStorage());
}
