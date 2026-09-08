/**
 * تست سیستم «مراحل» (۴۸ مرحله در ۴ دفتر).
 *
 * قاعده‌ی حیاتی: مرحله‌ی N باید روی هر دستگاه و هر نصب، *همان* معما را بدهد.
 * پس difficultyForLevel و seedForLevel باید کاملاً قطعی (deterministic) باشند.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createShellStorage, type ShellStorage } from '../src/core/storage';
import {
  LEVELS_KEY,
  LEVELS_PER_CHAPTER,
  TOTAL_CHAPTERS,
  TOTAL_LEVELS,
  buildLevels,
  currentLevel,
  difficultyForLevel,
  isUnlocked,
  readProgress,
  recordLevelWin,
  resetProgress,
  sanitizeProgress,
  seedForLevel,
} from '../src/core/levels';

function freshStorage(): ShellStorage {
  return createShellStorage({});
}

describe('ثابت‌های مراحل', () => {
  it('۴ دفتر × ۱۲ مرحله = ۴۸ مرحله', () => {
    expect(LEVELS_PER_CHAPTER).toBe(12);
    expect(TOTAL_CHAPTERS).toBe(4);
    expect(TOTAL_LEVELS).toBe(48);
  });
});

describe('difficultyForLevel — پیشرفت تدریجی دشواری', () => {
  it('برای همه‌ی مراحل در بازه‌ی ۱..۵ است', () => {
    for (let n = 1; n <= TOTAL_LEVELS; n++) {
      const d = difficultyForLevel(n);
      expect(d, `مرحله ${String(n)}`).toBeGreaterThanOrEqual(1);
      expect(d, `مرحله ${String(n)}`).toBeLessThanOrEqual(5);
    }
  });

  it('اکیداً نزولی نیست — دشواری هرگز کم نمی‌شود', () => {
    for (let n = 2; n <= TOTAL_LEVELS; n++) {
      expect(difficultyForLevel(n)).toBeGreaterThanOrEqual(difficultyForLevel(n - 1));
    }
  });

  it('مرحله‌ی اول آسان‌ترین و مرحله‌ی آخر سخت‌ترین است', () => {
    expect(difficultyForLevel(1)).toBe(1);
    expect(difficultyForLevel(TOTAL_LEVELS)).toBe(5);
  });

  it('ورودی نامعتبر را به بازه محدود می‌کند', () => {
    expect(difficultyForLevel(0)).toBe(difficultyForLevel(1));
    expect(difficultyForLevel(-99)).toBe(difficultyForLevel(1));
    expect(difficultyForLevel(9999)).toBe(difficultyForLevel(TOTAL_LEVELS));
  });
});

describe('seedForLevel — قطعی و متنوع', () => {
  it('برای یک مرحله همیشه همان seed را می‌دهد', () => {
    for (let n = 1; n <= TOTAL_LEVELS; n++) {
      expect(seedForLevel(n)).toBe(seedForLevel(n));
    }
  });

  it('seedها عدد صحیح نامنفی‌اند', () => {
    for (let n = 1; n <= TOTAL_LEVELS; n++) {
      const s = seedForLevel(n);
      expect(Number.isInteger(s), `مرحله ${String(n)}`).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
    }
  });

  it('هیچ دو مرحله‌ای seed یکسان ندارند', () => {
    const seen = new Set<number>();
    for (let n = 1; n <= TOTAL_LEVELS; n++) seen.add(seedForLevel(n));
    expect(seen.size).toBe(TOTAL_LEVELS);
  });
});

describe('sanitizeProgress — مقاوم در برابر داده‌ی خراب', () => {
  it('ورودی‌های بی‌ربط را به صفر برمی‌گرداند', () => {
    for (const bad of [null, undefined, 42, 'x', [], {}, { cleared: 'y' }, { cleared: NaN }]) {
      expect(sanitizeProgress(bad).cleared).toBe(0);
    }
  });

  it('مقدار منفی و بزرگ‌تر از کل را محدود می‌کند', () => {
    expect(sanitizeProgress({ cleared: -5 }).cleared).toBe(0);
    expect(sanitizeProgress({ cleared: 999 }).cleared).toBe(TOTAL_LEVELS);
  });
});

describe('پیشرفت پایدار روی Storage', () => {
  let storage: ShellStorage;
  beforeEach(() => {
    storage = freshStorage();
  });

  it('در ابتدا هیچ مرحله‌ای تمام نشده', () => {
    expect(readProgress(storage).cleared).toBe(0);
    expect(currentLevel(readProgress(storage))).toBe(1);
  });

  it('بردن مرحله‌ی جاری آن را ثبت می‌کند و بعدی را باز می‌کند', () => {
    const p = recordLevelWin(storage, 1);
    expect(p.cleared).toBe(1);
    expect(currentLevel(p)).toBe(2);
    expect(isUnlocked(p, 2)).toBe(true);
    expect(isUnlocked(p, 3)).toBe(false);
  });

  it('یکنواخت است — بردن دوباره‌ی مرحله‌ی قبلی پیشرفت را عقب نمی‌برد', () => {
    recordLevelWin(storage, 1);
    recordLevelWin(storage, 2);
    recordLevelWin(storage, 3);
    expect(readProgress(storage).cleared).toBe(3);
    const p = recordLevelWin(storage, 1);
    expect(p.cleared, 'پیشرفت نباید کم شود').toBe(3);
  });

  it('پیشرفت روی Storage ذخیره می‌شود (بازخوانی همان مقدار)', () => {
    recordLevelWin(storage, 1);
    recordLevelWin(storage, 2);
    expect(storage.get<{ cleared: number }>(LEVELS_KEY)?.cleared).toBe(2);
    expect(readProgress(storage).cleared).toBe(2);
  });

  it('resetProgress همه‌چیز را صفر می‌کند', () => {
    recordLevelWin(storage, 1);
    expect(resetProgress(storage).cleared).toBe(0);
    expect(readProgress(storage).cleared).toBe(0);
    expect(isUnlocked(readProgress(storage), 2)).toBe(false);
  });

  it('currentLevel از کل مراحل فراتر نمی‌رود', () => {
    for (let n = 1; n <= TOTAL_LEVELS; n++) recordLevelWin(storage, n);
    const p = readProgress(storage);
    expect(p.cleared).toBe(TOTAL_LEVELS);
    expect(currentLevel(p)).toBe(TOTAL_LEVELS);
  });
});

describe('buildLevels — مدل صفحه‌ی مراحل', () => {
  it('۴۸ مرحله با شماره‌ی پیوسته می‌سازد', () => {
    const levels = buildLevels({ cleared: 0 });
    expect(levels).toHaveLength(TOTAL_LEVELS);
    levels.forEach((l, i) => {
      expect(l.n).toBe(i + 1);
      expect(l.chapter).toBe(Math.ceil((i + 1) / LEVELS_PER_CHAPTER));
      expect(l.difficulty).toBe(difficultyForLevel(i + 1));
      expect(l.seed).toBe(seedForLevel(i + 1));
    });
  });

  it('با پیشرفت صفر: مرحله ۱ جاری، بقیه قفل', () => {
    const levels = buildLevels({ cleared: 0 });
    expect(levels[0]?.state).toBe('current');
    expect(levels.slice(1).every((l) => l.state === 'locked')).toBe(true);
  });

  it('با ۳ مرحله‌ی برده: ۳ تمام، ۴ جاری، بقیه قفل', () => {
    const levels = buildLevels({ cleared: 3 });
    expect(levels.slice(0, 3).every((l) => l.state === 'done')).toBe(true);
    expect(levels[3]?.state).toBe('current');
    expect(levels[4]?.state).toBe('locked');
  });

  it('با همه‌ی مراحل برده: هیچ مرحله‌ی قفل یا جاری نمی‌ماند', () => {
    const levels = buildLevels({ cleared: TOTAL_LEVELS });
    expect(levels.every((l) => l.state === 'done')).toBe(true);
  });

  it('هر دفتر دقیقاً ۱۲ مرحله دارد', () => {
    const levels = buildLevels({ cleared: 0 });
    for (let c = 1; c <= TOTAL_CHAPTERS; c++) {
      expect(levels.filter((l) => l.chapter === c)).toHaveLength(LEVELS_PER_CHAPTER);
    }
  });
});
