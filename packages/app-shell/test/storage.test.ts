import { describe, expect, it, vi } from 'vitest';
import {
  createCapacitorStorage,
  createShellStorage,
  type CapacitorPreferencesLike,
} from '../src/core/storage';

function fakeLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('createShellStorage — تشخیص محیط', () => {
  it('در وب از localStorage استفاده می‌کند', async () => {
    const ls = fakeLocalStorage();
    const s = createShellStorage({ localStorage: ls });
    await s.hydrate();
    s.set('dor.settings', { theme: 'dark' });
    expect(s.get<{ theme: string }>('dor.settings')).toEqual({ theme: 'dark' });
    expect(ls.getItem('dor.settings')).toBe('{"theme":"dark"}');
  });

  it('بدون localStorage به حافظه fallback می‌کند', () => {
    const s = createShellStorage({});
    s.set('k', 1);
    expect(s.get<number>('k')).toBe(1);
  });

  it('localStorage خراب (private mode) → fallback حافظه', () => {
    const broken = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
        removeItem: () => undefined,
      } as unknown as Storage,
    };
    const s = createShellStorage(broken);
    s.set('k', 'v');
    expect(s.get<string>('k')).toBe('v');
  });

  it('کلید غایب → null', () => {
    const s = createShellStorage({ localStorage: fakeLocalStorage() });
    expect(s.get('missing')).toBeNull();
  });

  it('در native از Capacitor Preferences استفاده می‌کند', async () => {
    const store = new Map<string, string>([['pre', JSON.stringify({ a: 1 })]]);
    const prefs: CapacitorPreferencesLike = {
      get: async ({ key }) => ({ value: store.get(key) ?? null }),
      set: async ({ key, value }) => void store.set(key, value),
      keys: async () => ({ keys: [...store.keys()] }),
    };
    const env = {
      Capacitor: { isNativePlatform: () => true, Plugins: { Preferences: prefs } },
    };
    const s = createShellStorage(env);
    await s.hydrate();
    // hydrate: مقدار قبلی native خوانده شد
    expect(s.get<{ a: number }>('pre')).toEqual({ a: 1 });
    // write-through
    s.set('k2', 'v2');
    expect(s.get<string>('k2')).toBe('v2');
    await vi.waitFor(() => expect(store.get('k2')).toBe('"v2"'));
  });

  it('Capacitor غیر-native → localStorage', async () => {
    const ls = fakeLocalStorage();
    const s = createShellStorage({
      Capacitor: { isNativePlatform: () => false },
      localStorage: ls,
    });
    s.set('k', true);
    expect(ls.getItem('k')).toBe('true');
    await s.hydrate();
  });
});

describe('createCapacitorStorage — سخت‌جانی', () => {
  it('خطای native در set اپ را نمی‌شکند', () => {
    const prefs: CapacitorPreferencesLike = {
      get: async () => ({ value: null }),
      set: async () => {
        throw new Error('native down');
      },
      keys: async () => ({ keys: [] }),
    };
    const s = createCapacitorStorage(prefs);
    expect(() => s.set('k', 1)).not.toThrow();
    expect(s.get<number>('k')).toBe(1); // کش هنوز کار می‌کند
  });

  it('خطای native در hydrate → ادامه با کش خالی', async () => {
    const prefs: CapacitorPreferencesLike = {
      get: async () => {
        throw new Error('boom');
      },
      set: async () => undefined,
      keys: async () => {
        throw new Error('boom');
      },
    };
    const s = createCapacitorStorage(prefs);
    await expect(s.hydrate()).resolves.toBeUndefined();
    expect(s.get('any')).toBeNull();
  });

  it('JSON خراب در کش → null', async () => {
    const prefs: CapacitorPreferencesLike = {
      get: async () => ({ value: '{invalid' }),
      set: async () => undefined,
      keys: async () => ({ keys: ['bad'] }),
    };
    const s = createCapacitorStorage(prefs);
    await s.hydrate();
    expect(s.get('bad')).toBeNull();
  });
});
