/**
 * سیستم «مراحل» — پیشرفت خطی و قطعی روی موتور واقعی.
 *
 * چرا در پوسته و نه در یک پکیج جدا: مراحل فقط یک لایه‌ی چیدمانِ روی
 * `EngineApi.getPracticePuzzle(difficulty, seed)` است. هیچ منطق حدس‌زنی
 * تازه‌ای ندارد؛ فقط (۱) نگاشت شماره‌ی مرحله → (دشواری، seed) قطعی،
 * (۲) قفل/بازشدن، (۳) ذخیره‌ی پیشرفت در Storage مشترک.
 *
 * قطعیت (determinism) خط سرخ است: مرحله‌ی N روی هر دستگاه و هر نصب،
 * همان کلمه را می‌دهد. پس seed از خودِ N ساخته می‌شود، نه از Math.random.
 */
import type { ShellStorage } from './storage';

/** کلید پیشرفت مراحل در Storage (خارج از کلیدهای رزروشده‌ی ماژول‌ها) */
export const LEVELS_KEY = 'dor.shell.levels';

/** تعداد کل مراحل MVP — ۴ دفتر × ۱۲ مرحله */
export const LEVELS_PER_CHAPTER = 12;
export const TOTAL_CHAPTERS = 4;
export const TOTAL_LEVELS = LEVELS_PER_CHAPTER * TOTAL_CHAPTERS;

export interface LevelsProgress {
  /** بالاترین مرحله‌ی برده‌شده (۰ = هنوز هیچ) */
  cleared: number;
}

export interface LevelDef {
  /** شماره‌ی مرحله، از ۱ */
  n: number;
  /** دفتر (۱..۴) */
  chapter: number;
  /** دشواری موتور ۱..۵ */
  difficulty: number;
  /** seed قطعی برای getPracticePuzzle */
  seed: number;
  state: 'done' | 'current' | 'locked';
}

/**
 * دشواری مرحله: در طول ۴۸ مرحله از ۱ به ۵ می‌رسد (شیب ملایم، Csikszentmihalyi 1990
 * — چالش کمی بالاتر از مهارت، نه پرتگاه).
 */
export function difficultyForLevel(n: number): number {
  const clamped = Math.min(TOTAL_LEVELS, Math.max(1, Math.trunc(n)));
  const chapter = Math.ceil(clamped / LEVELS_PER_CHAPTER); // ۱..۴
  const withinChapter = ((clamped - 1) % LEVELS_PER_CHAPTER) + 1; // ۱..۱۲
  // دفتر ۱ → ۱..۲، دفتر ۲ → ۲..۳، دفتر ۳ → ۳..۴، دفتر ۴ → ۴..۵
  const bump = withinChapter > LEVELS_PER_CHAPTER / 2 ? 1 : 0;
  return Math.min(5, chapter + bump);
}

/** seed قطعی مرحله — hash ساده و پایدار روی n (بدون وابستگی خارجی) */
export function seedForLevel(n: number): number {
  let h = 0x9e3779b1 ^ Math.trunc(n);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  // seed مثبت در بازه‌ی امن
  return Math.abs(h) % 1_000_000_007;
}

export function sanitizeProgress(raw: unknown): LevelsProgress {
  const obj = raw as { cleared?: unknown } | null;
  const c = typeof obj?.cleared === 'number' && Number.isFinite(obj.cleared) ? obj.cleared : 0;
  return { cleared: Math.min(TOTAL_LEVELS, Math.max(0, Math.trunc(c))) };
}

export function readProgress(storage: ShellStorage): LevelsProgress {
  return sanitizeProgress(storage.get<LevelsProgress>(LEVELS_KEY));
}

/** ثبت برد یک مرحله — فقط جلو می‌رود (بردِ دوباره‌ی مرحله‌ی قدیمی چیزی را عقب نمی‌برد) */
export function recordLevelWin(storage: ShellStorage, n: number): LevelsProgress {
  const prev = readProgress(storage);
  const next: LevelsProgress = {
    cleared: Math.min(TOTAL_LEVELS, Math.max(prev.cleared, Math.trunc(n))),
  };
  storage.set(LEVELS_KEY, next);
  return next;
}

export function resetProgress(storage: ShellStorage): LevelsProgress {
  const next: LevelsProgress = { cleared: 0 };
  storage.set(LEVELS_KEY, next);
  return next;
}

/** اولین مرحله‌ی بازِ نبرده — همان «مرحله‌ی جاری» */
export function currentLevel(p: LevelsProgress): number {
  return Math.min(TOTAL_LEVELS, p.cleared + 1);
}

export function isUnlocked(p: LevelsProgress, n: number): boolean {
  return Math.trunc(n) <= currentLevel(p);
}

/** فهرست کامل مراحل با وضعیت — ورودی رندر صفحه‌ی مراحل */
export function buildLevels(p: LevelsProgress): LevelDef[] {
  const cur = currentLevel(p);
  const out: LevelDef[] = [];
  for (let n = 1; n <= TOTAL_LEVELS; n += 1) {
    out.push({
      n,
      chapter: Math.ceil(n / LEVELS_PER_CHAPTER),
      difficulty: difficultyForLevel(n),
      seed: seedForLevel(n),
      state: n <= p.cleared ? 'done' : n === cur ? 'current' : 'locked',
    });
  }
  return out;
}
