import { describe, it, expect } from 'vitest';
import * as contracts from '../src/index';

/**
 * تست barrel — تضمین می‌کند index.ts همه‌ی ماژول‌ها را صادر می‌کند و
 * ماژول‌های صرفاً-تایپی (word-db، backend و…) بدون خطا بارگذاری می‌شوند.
 */
describe('contracts barrel (src/index)', () => {
  it('APIهای اجرایی از ریشه در دسترس‌اند', () => {
    expect(typeof contracts.normalizeFa).toBe('function');
    expect(typeof contracts.toPersianDigits).toBe('function');
    expect(typeof contracts.puzzleNumberForNow).toBe('function');
    expect(typeof contracts.createEventBus).toBe('function');
    expect(typeof contracts.createMemoryStorage).toBe('function');
    expect(typeof contracts.createWebStorage).toBe('function');
    expect(typeof contracts.createTranslator).toBe('function');
    expect(typeof contracts.puzzleStorageKey).toBe('function');
  });

  it('ثابت‌های قراردادی از ریشه در دسترس‌اند', () => {
    expect(contracts.PUZZLE_EPOCH).toBe('2026-09-01');
    expect(contracts.PUZZLE_TIMEZONE).toBe('Asia/Tehran');
    expect(contracts.DEFAULT_LOCALE).toBe('fa');
    expect(contracts.STORAGE_KEYS.profile).toBe('dor.profile');
  });
});
