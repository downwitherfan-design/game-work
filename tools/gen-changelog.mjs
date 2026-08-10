#!/usr/bin/env node
/**
 * تولید CHANGELOG.md خودکار از Conventional Commits — بدون هیچ وابستگی
 * (جایگزین سبک semantic-release، مطابق سیاست docs/deps-policy.md).
 *
 * استفاده:
 *   node tools/gen-changelog.mjs            → CHANGELOG.md کامل از ابتدای تاریخچه
 *   node tools/gen-changelog.mjs v0.1.0     → فقط از تگ داده‌شده به بعد
 *
 * گروه‌بندی: feat → ✨، fix → 🐛، ci → ⚙️، docs → 📚، chore/refactor/test → 🧹
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const GROUPS = [
  { key: 'feat', title: '✨ قابلیت‌ها' },
  { key: 'fix', title: '🐛 رفع اشکال' },
  { key: 'ci', title: '⚙️ CI/CD' },
  { key: 'docs', title: '📚 مستندات' },
  { key: 'other', title: '🧹 سایر (chore/refactor/test)' },
];

function main() {
  const fromTag = process.argv[2];
  const range = fromTag ? `${fromTag}..HEAD` : 'HEAD';
  const raw = execSync(`git log ${range} --pretty=format:%h%x09%s`, {
    encoding: 'utf8',
  }).trim();
  if (!raw) {
    console.log('ℹ️ کامیتی در بازه‌ی خواسته‌شده نیست.');
    return;
  }

  const buckets = new Map(GROUPS.map((g) => [g.key, []]));
  for (const line of raw.split('\n')) {
    const [hash, ...rest] = line.split('\t');
    const subject = rest.join('\t');
    const m = subject.match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/);
    const type = m ? m[1] : 'other';
    const key = buckets.has(type) ? type : 'other';
    buckets.get(key).push(`- ${subject} (\`${hash}\`)`);
  }

  const today = new Date().toISOString().slice(0, 10);
  let out = `# 📜 CHANGELOG — دُردانه\n\n`;
  out += `> تولید خودکار از Conventional Commits — ${today}`;
  out += fromTag ? ` (از ${fromTag})\n\n` : `\n\n`;
  for (const g of GROUPS) {
    const items = buckets.get(g.key);
    if (!items.length) continue;
    out += `## ${g.title}\n\n${items.join('\n')}\n\n`;
  }

  writeFileSync('CHANGELOG.md', out);
  console.log(`✅ CHANGELOG.md نوشته شد (${raw.split('\n').length} کامیت).`);
}

main();
