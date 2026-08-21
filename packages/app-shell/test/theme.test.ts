import { describe, expect, it } from 'vitest';
import { createMemoryStorage, STORAGE_KEYS } from '@dordaneh/contracts';
import {
  createThemeManager,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../src/core/theme';

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
  };
}

describe('ThemeManager', () => {
  it('auto → از prefers-color-scheme پیروی می‌کند', () => {
    const root = fakeRoot();
    const tm = createThemeManager(
      { root, matchMedia: () => ({ matches: true }) },
      { ...DEFAULT_SETTINGS, theme: 'auto' },
    );
    expect(tm.resolved()).toBe('dark');
    expect(root.attrs.get('data-theme')).toBe('dark');
  });

  it('انتخاب صریح light/dark بر سیستم مقدم است', () => {
    const root = fakeRoot();
    const tm = createThemeManager(
      { root, matchMedia: () => ({ matches: true }) },
      { ...DEFAULT_SETTINGS, theme: 'light' },
    );
    expect(tm.resolved()).toBe('light');
    tm.setTheme('dark');
    expect(root.attrs.get('data-theme')).toBe('dark');
    expect(tm.getPreference()).toBe('dark');
  });

  it('تغییر زنده‌ی سیستم در حالت auto اعمال می‌شود', () => {
    const root = fakeRoot();
    let listener: ((e: { matches: boolean }) => void) | undefined;
    const tm = createThemeManager(
      {
        root,
        matchMedia: () => ({
          matches: false,
          addEventListener: (_t, cb) => {
            listener = cb;
          },
        }),
      },
      { ...DEFAULT_SETTINGS, theme: 'auto' },
    );
    expect(tm.resolved()).toBe('light');
    listener?.({ matches: true });
    expect(root.attrs.get('data-theme')).toBe('dark');
  });

  it('در حالت غیر-auto تغییر سیستم بی‌اثر است', () => {
    const root = fakeRoot();
    let listener: ((e: { matches: boolean }) => void) | undefined;
    createThemeManager(
      {
        root,
        matchMedia: () => ({
          matches: false,
          addEventListener: (_t, cb) => {
            listener = cb;
          },
        }),
      },
      { ...DEFAULT_SETTINGS, theme: 'light' },
    );
    listener?.({ matches: true });
    expect(root.attrs.get('data-theme')).toBe('light');
  });

  it('کوررنگی روی data-colorblind می‌نشیند', () => {
    const root = fakeRoot();
    const tm = createThemeManager({ root }, { ...DEFAULT_SETTINGS, colorblind: true });
    expect(root.attrs.get('data-colorblind')).toBe('true');
    tm.setColorblind(false);
    expect(root.attrs.get('data-colorblind')).toBe('false');
  });

  it('بدون matchMedia (تست/SSR) → light', () => {
    const root = fakeRoot();
    const tm = createThemeManager({ root }, DEFAULT_SETTINGS);
    expect(tm.resolved()).toBe('light');
  });
});

describe('settings persistence', () => {
  it('load بدون ذخیره → پیش‌فرض‌ها', () => {
    const s = createMemoryStorage();
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
  });

  it('save/load چرخه‌ی کامل + merge با پیش‌فرض', () => {
    const s = createMemoryStorage();
    saveSettings(s, { ...DEFAULT_SETTINGS, theme: 'dark', sfx: false });
    const loaded = loadSettings(s);
    expect(loaded.theme).toBe('dark');
    expect(loaded.sfx).toBe(false);
    expect(loaded.haptics).toBe(true); // از پیش‌فرض
    expect(s.get(STORAGE_KEYS.settings)).not.toBeNull();
  });
});
