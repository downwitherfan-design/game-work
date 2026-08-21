/**
 * مدیریت تم: light/dark/auto (پیش‌فرض auto = prefers-color-scheme) + حالت کوررنگی.
 * روی document.documentElement با data-theme / data-colorblind اعمال می‌شود
 * (قرارداد §4: ui-kit با [data-theme="dark"] استایل می‌دهد).
 */
import { STORAGE_KEYS, type StorageApi } from '@dordaneh/contracts';

export type ThemePreference = 'light' | 'dark' | 'auto';

export interface ShellSettings {
  theme: ThemePreference;
  colorblind: boolean;
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  dailyReminder: boolean;
  locale: 'fa';
}

export const DEFAULT_SETTINGS: ShellSettings = {
  theme: 'auto',
  colorblind: false,
  sfx: true,
  music: false,
  haptics: true,
  dailyReminder: false,
  locale: 'fa',
};

export function loadSettings(storage: StorageApi): ShellSettings {
  const saved = storage.get<Partial<ShellSettings>>(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export function saveSettings(storage: StorageApi, settings: ShellSettings): void {
  storage.set(STORAGE_KEYS.settings, settings);
}

interface MediaQueryLike {
  matches: boolean;
  addEventListener?: (type: 'change', cb: (e: { matches: boolean }) => void) => void;
}

interface ThemeEnv {
  root: { setAttribute(name: string, value: string): void };
  matchMedia?: (query: string) => MediaQueryLike;
}

export interface ThemeManager {
  /** تم مؤثر فعلی (auto → بر اساس سیستم) */
  resolved(): 'light' | 'dark';
  setTheme(pref: ThemePreference): void;
  setColorblind(on: boolean): void;
  getPreference(): ThemePreference;
}

/**
 * ThemeManager با تزریق محیط (تست‌پذیر بدون DOM واقعی).
 * auto: به تغییر prefers-color-scheme سیستم به‌صورت زنده واکنش نشان می‌دهد.
 */
export function createThemeManager(env: ThemeEnv, initial: ShellSettings): ThemeManager {
  let pref: ThemePreference = initial.theme;
  let systemDark = false;

  const mq = env.matchMedia?.('(prefers-color-scheme: dark)');
  if (mq) {
    systemDark = mq.matches;
    mq.addEventListener?.('change', (e) => {
      systemDark = e.matches;
      if (pref === 'auto') apply();
    });
  }

  function resolved(): 'light' | 'dark' {
    if (pref === 'auto') return systemDark ? 'dark' : 'light';
    return pref;
  }

  function apply(): void {
    env.root.setAttribute('data-theme', resolved());
  }

  apply();
  env.root.setAttribute('data-colorblind', initial.colorblind ? 'true' : 'false');

  return {
    resolved,
    getPreference: () => pref,
    setTheme(next: ThemePreference): void {
      pref = next;
      apply();
    },
    setColorblind(on: boolean): void {
      env.root.setAttribute('data-colorblind', on ? 'true' : 'false');
    },
  };
}
