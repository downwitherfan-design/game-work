#!/usr/bin/env node
/**
 * استقرار Cloudflare Pages/Workers — اسکریپت، نه اجرای دستی.
 *
 * استفاده:
 *   node tools/deploy-pages.mjs app       → اپ اصلی (packages/app-shell/dist)
 *   node tools/deploy-pages.mjs landing   → لندینگ وایرال (AI-07)
 *   node tools/deploy-pages.mjs api       → Worker بک‌اند (AI-09)
 *
 * پیش‌نیاز: متغیر محیطی CLOUDFLARE_API_TOKEN (در CI از Secrets؛ لوکال از .env — هرگز commit نشود).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const TARGETS = {
  app: {
    kind: 'pages',
    project: 'dordaneh-app',
    dir: 'packages/app-shell/dist',
    build: 'npm run build -w @dordaneh/app-shell',
  },
  landing: {
    kind: 'pages',
    project: 'dordaneh-landing',
    dir: 'packages/viral-share/landing/dist',
    build: 'npm run build:landing -w @dordaneh/viral-share --if-present',
  },
  api: {
    kind: 'worker',
    configPath: 'packages/backend-api/wrangler.jsonc',
    build: 'npm run build -w @dordaneh/backend-api',
  },
};

function sh(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  const name = process.argv[2];
  const t = TARGETS[name];
  if (!t) {
    console.error(`استفاده: node tools/deploy-pages.mjs <${Object.keys(TARGETS).join('|')}>`);
    process.exit(2);
  }
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN تنظیم نشده (Secrets در CI / .env در لوکال).');
    process.exit(1);
  }

  sh(t.build);

  if (t.kind === 'pages') {
    if (!existsSync(t.dir)) {
      console.error(`❌ خروجی build پیدا نشد: ${t.dir}`);
      process.exit(1);
    }
    sh(`npx wrangler pages deploy ${t.dir} --project-name ${t.project} --branch main`);
  } else {
    if (!existsSync(t.configPath)) {
      console.error(`❌ کانفیگ Worker پیدا نشد: ${t.configPath} (مالک: AI-09)`);
      process.exit(1);
    }
    sh(`npx wrangler deploy --config ${t.configPath}`);
  }
  console.log(`✅ استقرار «${name}» انجام شد.`);
}

main();
