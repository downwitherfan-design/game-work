#!/usr/bin/env node
/**
 * بودجه‌ی حجم — «budget as code» (الگوی استاندارد web-perf، Osmani/Google 2019).
 * سقف‌ها (docs/00_MASTER_PLAN + پرامپت AI-14):
 *   - باندل وب اولیه (gzip مجموع JS+CSS در dist):  < 2 MB
 *   - فایل AAB امضاشده:                              < 30 MB
 *
 * استفاده:
 *   node tools/check-budget.mjs web <distDir>     ← بعد از build وب
 *   node tools/check-budget.mjs aab <aabFile>     ← بعد از bundleRelease
 * خروج 0 = داخل بودجه، 1 = عبور از سقف.
 */
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export const BUDGETS = {
  webGzipBytes: 2 * 1024 * 1024, // 2 MB gzip — باندل اولیه‌ی وب
  aabBytes: 30 * 1024 * 1024, // 30 MB — سقف AAB بازار/مایکت
};

function fmt(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

export async function measureWebGzip(distDir) {
  let total = 0;
  const rows = [];
  for await (const f of walk(distDir)) {
    if (!/\.(js|mjs|css)$/.test(f)) continue;
    const gz = gzipSync(await fs.readFile(f)).length;
    total += gz;
    rows.push([f.slice(distDir.length + 1), gz]);
  }
  return { total, rows };
}

async function main() {
  const [mode, target] = process.argv.slice(2);

  if (mode === 'web') {
    const dist = target ?? 'packages/app-shell/dist';
    const { total, rows } = await measureWebGzip(dist);
    rows.sort((a, b) => b[1] - a[1]);
    console.log(`📦 gzip باندل وب (${dist}):`);
    for (const [name, gz] of rows.slice(0, 15)) console.log(`   ${fmt(gz).padStart(10)}  ${name}`);
    console.log(`   ${'—'.repeat(30)}\n   مجموع: ${fmt(total)} / بودجه: ${fmt(BUDGETS.webGzipBytes)}`);
    if (total >= BUDGETS.webGzipBytes) {
      console.error('❌ باندل وب از بودجه‌ی 2MB gzip عبور کرد — خزش حجم!');
      process.exit(1);
    }
    console.log('✅ داخل بودجه.');
    return;
  }

  if (mode === 'aab') {
    if (!target) {
      console.error('usage: node tools/check-budget.mjs aab <file.aab>');
      process.exit(2);
    }
    const { size } = await fs.stat(target);
    console.log(`📦 حجم AAB: ${(size / 1024 / 1024).toFixed(2)} MB / بودجه: 30 MB`);
    if (size >= BUDGETS.aabBytes) {
      console.error('❌ AAB از سقف 30MB بازار/مایکت عبور کرد!');
      process.exit(1);
    }
    console.log('✅ داخل بودجه.');
    return;
  }

  console.error('usage: node tools/check-budget.mjs <web|aab> <target>');
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
