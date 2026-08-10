import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  createWebStorage,
  puzzleStorageKey,
  STORAGE_KEYS,
} from '../src/storage';
import type { WebStorageLike } from '../src/storage';

describe('STORAGE_KEYS / puzzleStorageKey', () => {
  it('همه‌ی کلیدهای رزروشده پیشوند dor. دارند', () => {
    for (const v of Object.values(STORAGE_KEYS)) {
      expect(v.startsWith('dor.')).toBe(true);
    }
  });

  it('کلید معما را با پیشوند رزروشده می‌سازد', () => {
    expect(puzzleStorageKey('142')).toBe('dor.puzzle.142');
    expect(puzzleStorageKey('142').startsWith(STORAGE_KEYS.puzzlePrefix)).toBe(true);
  });
});

describe('createMemoryStorage', () => {
  it('get روی کلید ناموجود null برمی‌گرداند', () => {
    const s = createMemoryStorage();
    expect(s.get('dor.missing')).toBeNull();
  });

  it('set/get مقدارها را با round-trip JSON حفظ می‌کند', () => {
    const s = createMemoryStorage();
    s.set(STORAGE_KEYS.streak, { current: 5, best: 12 });
    expect(s.get(STORAGE_KEYS.streak)).toEqual({ current: 5, best: 12 });
    s.set('dor.n', 42);
    expect(s.get('dor.n')).toBe(42);
    s.set('dor.s', 'دُردانه');
    expect(s.get('dor.s')).toBe('دُردانه');
  });

  it('مقدار قدیمی با set جدید جایگزین می‌شود', () => {
    const s = createMemoryStorage();
    s.set('dor.k', 1);
    s.set('dor.k', 2);
    expect(s.get('dor.k')).toBe(2);
  });

  it('دو نمونه‌ی مستقل حافظه‌ی مشترک ندارند', () => {
    const a = createMemoryStorage();
    const b = createMemoryStorage();
    a.set('dor.k', 'x');
    expect(b.get('dor.k')).toBeNull();
  });
});

describe('createWebStorage', () => {
  function fakeBacking(): WebStorageLike & { map: Map<string, string> } {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
      setItem: (k, v) => {
        map.set(k, v);
      },
    };
  }

  it('set/get از پشتوانه‌ی وب‌مانند کار می‌کند', () => {
    const backing = fakeBacking();
    const s = createWebStorage(backing);
    s.set(STORAGE_KEYS.settings, { sfx: true });
    expect(s.get(STORAGE_KEYS.settings)).toEqual({ sfx: true });
    expect(backing.map.get(STORAGE_KEYS.settings)).toBe('{"sfx":true}');
  });

  it('کلید ناموجود → null', () => {
    const s = createWebStorage(fakeBacking());
    expect(s.get('dor.missing')).toBeNull();
  });

  it('JSON خراب در get → null (fail-soft)', () => {
    const backing = fakeBacking();
    backing.map.set('dor.bad', '{not json');
    const s = createWebStorage(backing);
    expect(s.get('dor.bad')).toBeNull();
  });

  it('خطای getItem (private mode) → null (fail-soft)', () => {
    const s = createWebStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    });
    expect(s.get('dor.k')).toBeNull();
  });

  it('خطای setItem (quota) هرگز پرتاب نمی‌شود (fail-soft)', () => {
    const s = createWebStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => s.set('dor.k', 'v')).not.toThrow();
  });
});
