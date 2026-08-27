#!/usr/bin/env node
/**
 * ابزار CI اعتبارسنجی data/cards.json — «خروجی قرمز = کامیت ممنوع».
 *
 * اجرا:  npm run validate -w @dordaneh/culture-cards
 * (Node 20+: `node --experimental-strip-types tools/validate.ts`؛ Node 22.6+
 * فلگ را خودکار دارد. منطق مشترک در src/validate.ts است و در تست‌های vitest
 * هم — که CI اجرا می‌کند — دقیقاً همین قواعد با حد ۳۰۰+ اعمال می‌شود.)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateCards, MIN_CARDS_TARGET } from '../src/validate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, '..', 'data', 'cards.json');

let raw: string;
try {
  raw = readFileSync(dataPath, 'utf8');
} catch {
  console.error(`❌ فایل داده پیدا نشد: ${dataPath}`);
  process.exit(1);
}

let cards: unknown;
try {
  cards = JSON.parse(raw);
} catch (e) {
  console.error(`❌ JSON نامعتبر: ${(e as Error).message}`);
  process.exit(1);
}

const result = validateCards(cards, MIN_CARDS_TARGET);

console.error(
  `📊 کل: ${result.total} | ضرب‌المثل: ${result.counts.proverb} | شعر: ${result.counts.poem} | دانستنی: ${result.counts.fact} | مناسبت: ${result.counts.occasion}`,
);

if (!result.ok) {
  console.error(`\n❌ ${result.errors.length} خطا:`);
  for (const err of result.errors) console.error(`  • ${err}`);
  process.exit(1);
}

console.error('✅ همه‌ی کارت‌ها معتبرند.');
