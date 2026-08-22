/**
 * لایه‌ی داده — بارگذاری JSONهای از-قبل-نرمال‌شده + ایندکس‌های O(1).
 * همه‌ی داده‌ها هنگام build با tools/validate.ts صحت‌سنجی می‌شوند.
 */
import type { FreqTier, WordMeta } from '@dordaneh/contracts';
import answers6Json from '../data/answers-6.json';
import practiceJson from '../data/answers-practice.json';
import validWordsJson from '../data/valid-words.json';
import blocklistJson from '../data/blocklist.json';
import answersMetaJson from '../data/answers-meta.json';

export interface PracticeEntry {
  word: string;
  wordLength: number;
  freqTier: FreqTier;
  category?: string;
}

/** آرایه‌ی مرتبِ جواب‌های ۶حرفی — ایندکس = ترتیب انتشار روزانه */
export const answers6: readonly string[] = answers6Json as string[];

/** کلمات تمرین ۴..۷ حرفی با tier فرکانسی */
export const practiceWords: readonly PracticeEntry[] = practiceJson as PracticeEntry[];

/** واژه‌نامه‌ی حدس‌های معتبر (ابرمجموعه‌ی جواب‌ها) */
export const validWords: readonly string[] = validWordsJson as string[];

/** واژه‌های ممنوعه — هرگز در answers/valid نیستند (تضمین با validate) */
export const blocklist: readonly string[] = blocklistJson as string[];

/** متادیتای جواب‌های ۶حرفی: freqTier و category */
export const answersMeta: Readonly<Record<string, WordMeta>> = answersMetaJson as Record<
  string,
  WordMeta
>;

// ---------------------------------------------------------------------------
// ایندکس‌های O(1) — یک‌بار ساخته می‌شوند
// ---------------------------------------------------------------------------

/** جستجوی O(1) اعتبار حدس */
export const validWordSet: ReadonlySet<string> = new Set(validWords);

/** متای کلمات تمرین برای getWordMeta */
const practiceMetaMap = new Map<string, WordMeta>();
for (const p of practiceWords) {
  if (!practiceMetaMap.has(p.word)) {
    practiceMetaMap.set(
      p.word,
      p.category ? { freqTier: p.freqTier, category: p.category } : { freqTier: p.freqTier },
    );
  }
}
export const wordMetaMap: ReadonlyMap<string, WordMeta> = practiceMetaMap;

/**
 * گروه‌بندی کلمات تمرین بر اساس tier — برای انتخاب قطعی بر اساس دشواری.
 * دشواری بازی 1..5 → نگاشت به tier در api.ts.
 */
const byTier: Record<FreqTier, PracticeEntry[]> = { 1: [], 2: [], 3: [] };
for (const p of practiceWords) byTier[p.freqTier].push(p);
export const practiceByTier: Readonly<Record<FreqTier, readonly PracticeEntry[]>> = byTier;
