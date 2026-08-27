import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, setLocale, t } from '../src/core/i18n';
import fa from '../locales/fa.json';

afterEach(() => setLocale('fa'));

describe('i18n پوسته', () => {
  it('پیش‌فرض fa است', () => {
    expect(getLocale()).toBe('fa');
  });

  it('کلیدهای appShell ترجمه می‌شوند', () => {
    expect(t('appShell.appName')).toBe('دُردانه');
    expect(t('appShell.nav.settings')).toBe('تنظیمات');
  });

  it('کلید غایب → خود کلید (UI نمی‌شکند)', () => {
    expect(t('appShell.missing.key')).toBe('appShell.missing.key');
  });

  it('جایگذاری پارامتر', () => {
    expect(t('appShell.settings.version', { version: '۱.۰' })).toContain('۱.۰');
  });

  it('زبان پشتیبانی‌نشده → فالبک fa', () => {
    setLocale('en');
    expect(getLocale()).toBe('fa');
    expect(t('appShell.appName')).toBe('دُردانه');
  });

  it('همه‌ی کلیدهای locale پیشوند appShell دارند (قرارداد §11)', () => {
    for (const key of Object.keys(fa)) {
      expect(key.startsWith('appShell.')).toBe(true);
    }
  });

  it('هیچ مقدار خالی در locale نیست', () => {
    for (const v of Object.values(fa)) {
      expect(String(v).trim().length).toBeGreaterThan(0);
    }
  });
});
