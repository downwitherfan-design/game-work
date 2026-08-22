/**
 * ابزار اعتبارسنجی داده‌ی word-db — CI این را اجرا می‌کند (از طریق test/validate.test.ts).
 * خروجی قرمز = کامیت ممنوع.
 *
 * بررسی‌ها:
 *  1. یکتایی در هر فایل
 *  2. طول درست (answers-6 دقیقا ۶؛ practice/valid در بازه ۴..۷)
 *  3. نرمال‌بودن (word === normalizeFa(word)) و الفبای مجاز
 *  4. عدم تقاطع با blocklist (answers، practice، valid)
 *  5. پوشش: همه‌ی answers و practice داخل valid-words
 *  6. حداقل حجم: answers-6 ≥ 730، practice ≥ 4000، valid ≥ 15000
 *  7. بدون هم‌خانواده‌ی پشت‌سرهم در answers-6
 *  8. answers-meta برای همه‌ی جواب‌ها موجود و معتبر
 */
import { normalizeFa } from '@dordaneh/contracts';
import answersJson from '../data/answers-6.json';
import practiceJson from '../data/answers-practice.json';
import validJson from '../data/valid-words.json';
import blockJson from '../data/blocklist.json';
import metaJson from '../data/answers-meta.json';

interface PracticeEntry {
  word: string;
  wordLength: number;
  freqTier: 1 | 2 | 3;
  category?: string;
}

const ALLOWED = new Set([...'آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئء']);
const charLen = (w: string): number => [...w].length;

export interface ValidateResult {
  errors: string[];
  stats: { answers: number; practice: number; valid: number; blocklist: number };
}

/** اجرای همه‌ی بررسی‌ها — برای تست و CLI مشترک */
export function validateData(): ValidateResult {
  const answers: string[] = answersJson;
  const practice = practiceJson as PracticeEntry[];
  const valid: string[] = validJson;
  const block: string[] = blockJson;
  const meta = metaJson as Record<string, { freqTier: number; category?: string } | undefined>;

  const errors: string[] = [];
  const err = (m: string): void => {
    errors.push(m);
  };

  function checkWord(w: string, file: string, minL: number, maxL: number): void {
    const l = charLen(w);
    if (l < minL || l > maxL)
      err(`${file}: «${w}» طول ${String(l)} خارج از [${String(minL)}..${String(maxL)}]`);
    if (w !== normalizeFa(w)) err(`${file}: «${w}» نرمال نیست`);
    for (const c of w)
      if (!ALLOWED.has(c))
        err(`${file}: «${w}» نویسه‌ی غیرمجاز «${c}» (U+${c.codePointAt(0)?.toString(16) ?? '?'})`);
  }

  function checkUnique(words: string[], file: string): void {
    const seen = new Set<string>();
    for (const w of words) {
      if (seen.has(w)) err(`${file}: تکراری «${w}»`);
      seen.add(w);
    }
  }

  // ---- ۱..۳: یکتایی، طول، نرمال‌بودن ----
  checkUnique(answers, 'answers-6');
  for (const w of answers) checkWord(w, 'answers-6', 6, 6);

  checkUnique(
    practice.map((p) => p.word),
    'answers-practice',
  );
  for (const p of practice) {
    checkWord(p.word, 'answers-practice', 4, 7);
    if (charLen(p.word) !== p.wordLength)
      err(`answers-practice: «${p.word}» wordLength=${String(p.wordLength)} نادرست`);
    if (![1, 2, 3].includes(p.freqTier)) err(`answers-practice: «${p.word}» freqTier نامعتبر`);
  }

  checkUnique(valid, 'valid-words');
  for (const w of valid) checkWord(w, 'valid-words', 4, 7);

  checkUnique(block, 'blocklist');
  for (const w of block) {
    if (w !== normalizeFa(w)) err(`blocklist: «${w}» نرمال نیست`);
  }

  // ---- ۴: عدم تقاطع با blocklist ----
  const blockSet = new Set(block);
  for (const w of answers) if (blockSet.has(w)) err(`answers-6: واژه‌ی ممنوعه «${w}»`);
  for (const p of practice)
    if (blockSet.has(p.word)) err(`answers-practice: واژه‌ی ممنوعه «${p.word}»`);
  for (const w of valid) if (blockSet.has(w)) err(`valid-words: واژه‌ی ممنوعه «${w}»`);

  // ---- ۵: پوشش در valid-words ----
  const validSet = new Set(valid);
  for (const w of answers) if (!validSet.has(w)) err(`answers-6: «${w}» در valid-words نیست`);
  for (const p of practice)
    if (!validSet.has(p.word)) err(`answers-practice: «${p.word}» در valid-words نیست`);

  // ---- ۶: حداقل حجم (DoD) ----
  if (answers.length < 730) err(`answers-6: ${String(answers.length)} < 730`);
  if (practice.length < 4000) err(`answers-practice: ${String(practice.length)} < 4000`);
  if (valid.length < 15000) err(`valid-words: ${String(valid.length)} < 15000`);
  if (block.length < 50) err(`blocklist: ${String(block.length)} < 50 — جامع نیست`);

  // ---- ۷: بدون هم‌خانواده‌ی پشت‌سرهم ----
  for (let i = 1; i < answers.length; i++) {
    const a = answers[i - 1] as string;
    const b = answers[i] as string;
    if (a.slice(0, 3) === b.slice(0, 3))
      err(`answers-6: هم‌خانواده‌ی پشت‌سرهم «${a}»→«${b}» (index ${String(i)})`);
  }

  // ---- ۸: متادیتای کامل ----
  for (const w of answers) {
    const m = meta[w];
    if (!m) {
      err(`answers-meta: «${w}» متادیتا ندارد`);
    } else if (![1, 2, 3].includes(m.freqTier)) {
      err(`answers-meta: «${w}» freqTier نامعتبر`);
    }
  }

  return {
    errors,
    stats: {
      answers: answers.length,
      practice: practice.length,
      valid: valid.length,
      blocklist: block.length,
    },
  };
}

/** گزارش متنی برای CLI/لاگ CI */
export function formatReport(r: ValidateResult): string {
  if (r.errors.length > 0) {
    const head = `❌ validate: ${String(r.errors.length)} خطا`;
    const body = r.errors.slice(0, 50).map((e) => '  ' + e);
    if (r.errors.length > 50) body.push(`  … و ${String(r.errors.length - 50)} خطای دیگر`);
    return [head, ...body].join('\n');
  }
  const s = r.stats;
  return `✅ validate سبز — answers: ${String(s.answers)}، practice: ${String(s.practice)}، valid: ${String(s.valid)}، blocklist: ${String(s.blocklist)}`;
}
