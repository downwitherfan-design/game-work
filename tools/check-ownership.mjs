#!/usr/bin/env node
/**
 * گارد مرز مالکیت — مهم‌ترین محافظ موازی‌کاری ۱۵ AI.
 * در PR بررسی می‌کند فایل‌های تغییرکرده فقط در مسیرهای مالکیت نویسنده‌ی شاخه باشند.
 * نگاشت شاخه‌ی ai-XX/* → مسیرهای مجاز از جدول بخش ۷ MASTER_PLAN.
 *
 * استفاده:
 *   node tools/check-ownership.mjs <branch-name> <changed-file> [<changed-file> ...]
 *   node tools/check-ownership.mjs <branch-name> --stdin   (فهرست از stdin، هر خط یک فایل)
 *
 * خروج 0 = مجاز، 1 = تخطی.
 */

/** مسیرهایی که هر AI مالک آن‌هاست (پیشوند مسیر نسبت به ریشه‌ی ریپو). */
export const OWNERSHIP = {
  'ai-01': ['packages/core-engine/'],
  'ai-02': ['packages/word-db/'],
  'ai-03': ['packages/culture-cards/'],
  'ai-04': ['packages/ui-kit/'],
  'ai-05': ['packages/app-shell/'],
  'ai-06': ['packages/game-board/'],
  'ai-07': ['packages/viral-share/'],
  'ai-08': ['packages/meta-retention/'],
  'ai-09': ['packages/backend-api/'],
  'ai-10': ['packages/duel-mode/'],
  'ai-11': ['packages/monetization/'],
  'ai-12': ['packages/analytics/'],
  'ai-13': ['packages/audio-haptics/'],
  // AI-14: زیرساخت — native، .github، ریشه، contracts (پیاده‌ساز اولیه) و tools
  'ai-14': ['native/', '.github/', 'packages/contracts/', 'tools/', ...rootFiles()],
  'ai-15': ['qa/'],
};

/** فایل‌های ریشه که فقط AI-14 مالک آن‌هاست. */
function rootFiles() {
  return [
    'package.json',
    'package-lock.json',
    'tsconfig.base.json',
    'vite.config.ts',
    'eslint.config.mjs',
    '.gitignore',
    '.editorconfig',
    '.prettierrc.json',
    'README.md',
  ];
}

/** مسیرهایی که همه مجازند تغییر دهند (RFCها و مستندات مشترک). */
export const SHARED_PATHS = ['docs/rfcs/'];

/** اسکلت اولیه‌ی هر پکیج را AI-14 می‌سازد؛ اما مالک هر پکیج هم می‌تواند README خودش را عوض کند. */
export function isAllowed(branch, file) {
  const m = /^(ai-\d{2})\//.exec(branch);
  if (!m) return { ok: true, reason: 'non-ai branch (main/hotfix) — guard skipped' };
  const ai = m[1];
  const owned = OWNERSHIP[ai];
  if (!owned) return { ok: false, reason: `unknown AI id: ${ai}` };

  for (const p of SHARED_PATHS) {
    if (file.startsWith(p)) return { ok: true, reason: 'shared RFC path' };
  }
  for (const p of owned) {
    if (p.endsWith('/') ? file.startsWith(p) : file === p) {
      return { ok: true, reason: `owned by ${ai}` };
    }
  }
  return { ok: false, reason: `path not owned by ${ai}` };
}

async function main() {
  const [branch, ...rest] = process.argv.slice(2);
  if (!branch) {
    console.error('usage: node tools/check-ownership.mjs <branch> <files...|--stdin>');
    process.exit(2);
  }

  let files = rest;
  if (rest[0] === '--stdin') {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    files = Buffer.concat(chunks).toString('utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  const violations = [];
  for (const f of files) {
    const r = isAllowed(branch, f);
    if (!r.ok) violations.push(`${f}  ←  ${r.reason}`);
  }

  if (violations.length > 0) {
    console.error(`❌ Ownership violation on branch "${branch}":`);
    for (const v of violations) console.error('   ' + v);
    console.error('\nهر AI فقط در مسیر مالکیت خودش commit می‌کند (MASTER_PLAN §7).');
    console.error('برای وابستگی جدید یا تغییر contracts: docs/rfcs/RFC-XXXX-<slug>.md');
    process.exit(1);
  }
  console.log(`✅ ownership OK — ${files.length} file(s) on "${branch}"`);
}

// اجرا فقط وقتی مستقیم صدا زده شود (نه هنگام import در تست)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
