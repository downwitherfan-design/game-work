/**
 * @dordaneh/contracts — StorageApi contract + reference implementations.
 * Source of truth: docs/02_CONTRACTS.md §5 (storage part). Locked (RFC only).
 */

export interface StorageApi {
  get<T>(key: string): T | null;
  set<T>(key: string, v: T): void;
}

/**
 * کلیدهای رزروشده‌ی ذخیره‌سازی — فقط از این ثابت‌ها استفاده کنید.
 * docs/02_CONTRACTS.md §5.
 */
export const STORAGE_KEYS = {
  profile: 'dor.profile',
  streak: 'dor.streak',
  stats: 'dor.stats',
  /** پیشوند وضعیت هر معما: `dor.puzzle.<id>` */
  puzzlePrefix: 'dor.puzzle.',
  album: 'dor.album',
  settings: 'dor.settings',
  iap: 'dor.iap',
  analyticsQueue: 'dor.analytics.queue',
} as const;

/** کلید وضعیت یک معمای مشخص */
export function puzzleStorageKey(puzzleId: string): string {
  return `${STORAGE_KEYS.puzzlePrefix}${puzzleId}`;
}

/**
 * پیاده‌سازی مرجع درون‌حافظه‌ای — برای تست و SSR.
 * app-shell (AI-05) نسخه‌ی localStorage/Capacitor Preferences را wire می‌کند.
 */
export function createMemoryStorage(): StorageApi {
  const map = new Map<string, string>();
  return {
    get<T>(key: string): T | null {
      const raw = map.get(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },
    set<T>(key: string, v: T): void {
      map.set(key, JSON.stringify(v));
    },
  };
}

/**
 * پیاده‌سازی مرجع روی یک Storage وب‌مانند (localStorage) — fail-soft:
 * خطای quota/JSON هرگز اپ آفلاین-اول را نمی‌شکند.
 */
export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createWebStorage(backing: WebStorageLike): StorageApi {
  return {
    get<T>(key: string): T | null {
      try {
        const raw = backing.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    set<T>(key: string, v: T): void {
      try {
        backing.setItem(key, JSON.stringify(v));
      } catch {
        // quota exceeded / private mode — silent degrade (offline-first)
      }
    },
  };
}
