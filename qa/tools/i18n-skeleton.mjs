#!/usr/bin/env node
/**
 * @dordaneh/qa — تولید اسکلت en.json / ar.json از fa.json هر پکیج UI.
 * کلیدها = fa، مقدار = "TODO: <متن فارسی>" — مالک هر پکیج خروجی را داخل
 * locales/ خودش کپی می‌کند (AI-15 حق نوشتن در پکیج دیگران را ندارد).
 *
 * استفاده:
 *   node qa/tools/i18n-skeleton.mjs           # خروجی در qa/i18n/generated/<pkg>/{en,ar}.json
 *   node qa/tools/i18n-skeleton.mjs --pseudo  # + pseudo.json برای تست pseudo-localization
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const OUT = join(ROOT, 'qa', 'i18n', 'generated');

const UI_PACKAGES = [
  'ui-kit',
  'app-shell',
  'game-board',
  'viral-share',
  'meta-retention',
  'duel-mode',
  'monetization',
];

const pseudo = process.argv.includes('--pseudo');

/**
 * pseudo-localization: متن ~۳۰٪ بلندتر + قاب [ ] برای دیدن سرریز/برش UI
 * (راهنما: qa/i18n-guide.md)
 */
function pseudoize(faText) {
  const pad = '~'.repeat(Math.max(1, Math.ceil(faText.length * 0.3)));
  return `[${faText}${pad}]`;
}

let generated = 0;
for (const pkg of UI_PACKAGES) {
  const faPath = join(ROOT, 'packages', pkg, 'locales', 'fa.json');
  if (!existsSync(faPath)) continue;
  const fa = JSON.parse(readFileSync(faPath, 'utf8'));

  const skeleton = {};
  const pseudoMsgs = {};
  for (const [key, value] of Object.entries(fa)) {
    skeleton[key] = `TODO: ${value}`;
    pseudoMsgs[key] = pseudoize(String(value));
  }

  const dir = join(OUT, pkg);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'en.json'), JSON.stringify(skeleton, null, 2) + '\n');
  writeFileSync(join(dir, 'ar.json'), JSON.stringify(skeleton, null, 2) + '\n');
  if (pseudo) writeFileSync(join(dir, 'pseudo.json'), JSON.stringify(pseudoMsgs, null, 2) + '\n');
  generated++;
  console.log(`✅ ${pkg}: ${Object.keys(fa).length} کلید → ${dir}`);
}

if (generated === 0) {
  console.log('ℹ️ هنوز هیچ پکیجی locales/fa.json ندارد (فاز ۰). اسکلت نمونه در qa/i18n/ موجود است.');
}
