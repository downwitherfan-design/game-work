#!/usr/bin/env node
/**
 * @dordaneh/qa — i18n-lint: نگهبان معماری چندزبانه (خط قرمز ۲۲ + قرارداد §11).
 *
 * چه می‌کند:
 *  1. اسکن سورس همه‌ی پکیج‌های UI برای «رشته‌ی فارسی هاردکد» خارج از locales/*.json
 *  2. کلیدهای بدون ترجمه: کلیدی که در fa.json هست اما در en.json/ar.json نیست (در حالت --strict)
 *  3. کلیدهای بی‌استفاده: کلیدی که در fa.json هست اما هیچ‌جا t('key') نشده
 *  4. کلید بدون پیشوند پکیج (قرارداد: "gameBoard.submit")
 *
 * استفاده:
 *   node qa/tools/i18n-lint.mjs                # گزارش؛ exit 1 اگر هاردکد فارسی باشد
 *   node qa/tools/i18n-lint.mjs --strict       # + کلید ناقص/بی‌استفاده هم fail
 *   node qa/tools/i18n-lint.mjs --report-only  # فقط گزارش، همیشه exit 0
 *
 * در CI (AI-14): node qa/tools/i18n-lint.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/** پکیج‌های UI که مشمول قانون «هیچ متن هاردکد» هستند */
const UI_PACKAGES = [
  'ui-kit',
  'app-shell',
  'game-board',
  'viral-share',
  'meta-retention',
  'duel-mode',
  'monetization',
];

/** نگاشت پکیج → پیشوند کلید قراردادی */
const KEY_PREFIX = {
  'ui-kit': 'uiKit',
  'app-shell': 'appShell',
  'game-board': 'gameBoard',
  'viral-share': 'viralShare',
  'meta-retention': 'metaRetention',
  'duel-mode': 'duelMode',
  monetization: 'monetization',
};

const PERSIAN_RE = /[\u0600-\u06FF]/;
const EXT_RE = /\.(ts|tsx|js|jsx|mjs)$/;

/**
 * خطوطی که مجازند فارسی داشته باشند:
 *  - کامنت‌ها (// و /* و *)
 *  - خطوط علامت‌گذاری‌شده با i18n-exempt (مثلاً داده‌ی تست یا ثابت غیر-UI)
 */
function isExemptLine(line) {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return true;
  if (t.includes('i18n-exempt')) return true;
  return false;
}

/** حذف کامنت‌های بلوکی چندخطی به‌صورت تقریبی برای کاهش false positive */
function stripBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return { __parse_error__: String(e) };
  }
}

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const reportOnly = args.has('--report-only');

const hardcoded = [];   // {file, line, text}
const badKeys = [];     // کلید بدون پیشوند درست
const missing = [];     // کلید fa بدون en/ar
const unused = [];      // کلید fa که هیچ‌جا t() نشده
const parseErrors = [];

for (const pkg of UI_PACKAGES) {
  const pkgDir = join(ROOT, 'packages', pkg);
  if (!existsSync(pkgDir)) continue;

  const srcDir = join(pkgDir, 'src');
  const localesDir = join(pkgDir, 'locales');

  // ۱) اسکن هاردکد فارسی در سورس
  let allSource = '';
  if (existsSync(srcDir)) {
    for (const file of walk(srcDir)) {
      if (!EXT_RE.test(file)) continue;
      const raw = readFileSync(file, 'utf8');
      allSource += raw + '\n';
      const src = stripBlockComments(raw);
      src.split('\n').forEach((line, i) => {
        if (PERSIAN_RE.test(line) && !isExemptLine(line)) {
          hardcoded.push({
            file: relative(ROOT, file),
            line: i + 1,
            text: line.trim().slice(0, 90),
          });
        }
      });
    }
  }

  // ۲) بررسی فایل‌های locale
  const faPath = join(localesDir, 'fa.json');
  if (!existsSync(faPath)) continue; // فاز ۰: هنوز locale ندارد — هاردکد هم که ندارد
  const fa = loadJson(faPath);
  if (fa.__parse_error__) {
    parseErrors.push({ file: relative(ROOT, faPath), error: fa.__parse_error__ });
    continue;
  }

  const prefix = KEY_PREFIX[pkg];
  for (const key of Object.keys(fa)) {
    if (prefix && !key.startsWith(prefix + '.')) {
      badKeys.push({ pkg, key, expected: `${prefix}.*` });
    }
    // ۳) کلید بی‌استفاده؟ (جستجوی t('key') یا t("key") یا خود کلید در سورس)
    if (allSource && !allSource.includes(`'${key}'`) && !allSource.includes(`"${key}"`) && !allSource.includes('`' + key + '`')) {
      unused.push({ pkg, key });
    }
  }

  // کلیدهای بدون ترجمه در en/ar
  for (const loc of ['en', 'ar']) {
    const p = join(localesDir, `${loc}.json`);
    if (!existsSync(p)) {
      missing.push({ pkg, locale: loc, key: '(کل فایل غایب)' });
      continue;
    }
    const other = loadJson(p);
    if (other.__parse_error__) {
      parseErrors.push({ file: relative(ROOT, p), error: other.__parse_error__ });
      continue;
    }
    for (const key of Object.keys(fa)) {
      if (!(key in other)) missing.push({ pkg, locale: loc, key });
    }
  }
}

// ── گزارش ────────────────────────────────────────────────────────────────
const log = (...a) => console.log(...a);

log('🌐 i18n-lint — دُردانه');
log('─'.repeat(60));

if (parseErrors.length) {
  log(`\n❌ خطای JSON در locale (${parseErrors.length}):`);
  for (const e of parseErrors) log(`  ${e.file}: ${e.error}`);
}

if (hardcoded.length) {
  log(`\n❌ رشته‌ی فارسی هاردکد در سورس UI (${hardcoded.length}) — خط قرمز ۲۲:`);
  for (const h of hardcoded.slice(0, 50)) log(`  ${h.file}:${h.line}  ${h.text}`);
  if (hardcoded.length > 50) log(`  … و ${hardcoded.length - 50} مورد دیگر`);
} else {
  log('\n✅ هیچ رشته‌ی فارسی هاردکدی در سورس پکیج‌های UI نیست.');
}

if (badKeys.length) {
  log(`\n⚠️ کلید بدون پیشوند قراردادی (${badKeys.length}):`);
  for (const b of badKeys.slice(0, 20)) log(`  [${b.pkg}] ${b.key} → باید ${b.expected} باشد`);
}

if (missing.length) {
  log(`\n⚠️ کلید بدون ترجمه (${missing.length}):`);
  for (const m of missing.slice(0, 20)) log(`  [${m.pkg}/${m.locale}] ${m.key}`);
  if (missing.length > 20) log(`  … و ${missing.length - 20} مورد دیگر`);
}

if (unused.length) {
  log(`\n⚠️ کلید بی‌استفاده در fa.json (${unused.length}):`);
  for (const u of unused.slice(0, 20)) log(`  [${u.pkg}] ${u.key}`);
}

log('\n' + '─'.repeat(60));

const hardFail = hardcoded.length > 0 || parseErrors.length > 0;
const strictFail = strict && (badKeys.length > 0 || missing.length > 0 || unused.length > 0);

if (reportOnly) {
  log('حالت report-only — خروج 0');
  process.exit(0);
}
if (hardFail || strictFail) {
  log(`نتیجه: ❌ FAIL (hardcoded=${hardcoded.length}, strict=${strictFail})`);
  process.exit(1);
}
log('نتیجه: ✅ PASS');
process.exit(0);
