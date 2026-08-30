#!/usr/bin/env node
/**
 * تولید آیکون رسمی اپ دُردانه از فایل هنری اصلی (master artwork).
 *
 * منبع حقیقت: native/store/icon-master.png  ← آیکون طراحی‌شده‌ی برند
 * (کاشی فیروزه‌ای با قاب طلایی، نام «دُردانه» در ترنج، کتاب باز و قطعه‌ی پازل).
 *
 * چرا این روش: نسخه‌ی قبلی این ابزار آیکون را با رسم حرف «د» توسط ImageMagick
 * می‌ساخت که کیفیت هنری قابل قبولی نداشت. اکنون فقط از فایل هنری نهایی
 * برش/مقیاس گرفته می‌شود — هیچ رندر فونتی انجام نمی‌شود (پس نیازی به
 * fontTools/brotli هم نیست).
 *
 * خروجی‌ها:
 *   - آیکون لانچر در ۵ چگالی mipmap (عادی + گِرد + foreground آیکون adaptive)
 *   - adaptive-icon XML برای اندروید ۸+ (پس‌زمینه‌ی هم‌رنگ کاشی آیکون)
 *   - آیکون ۵۱۲×۵۱۲ فروشگاه‌ها: native/store/icon-512.png
 *   - آیکون‌های PWA: packages/app-shell/public/icons
 *
 * دو حالت اجرا:
 *   الف) حالت «کپی» (پیش‌فرض در CI): اگر پوشه‌ی native/store/icons موجود باشد،
 *        آیکون‌های از پیش رندرشده‌ی کامیت‌شده فقط کپی می‌شوند. هیچ ابزار
 *        گرافیکی لازم نیست — رانر گیت‌هاب ImageMagick ندارد.
 *   ب) حالت «رندر» (روی ماشین توسعه): اگر آیکون‌های آماده نبودند و magick
 *        نصب بود، همه چیز از icon-master.png بازتولید می‌شود.
 *
 * بازتولید آیکون‌های آماده پس از تغییر فایل هنری:
 *   node tools/gen-app-icons.mjs --render
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nativeDir = resolve(here, '..');
const repoRoot = resolve(nativeDir, '..');
const androidRes = resolve(nativeDir, 'android/app/src/main/res');
const tmp = resolve(nativeDir, '.icon-tmp');

/** فایل هنری اصلی برند — منبع همه‌ی آیکون‌ها */
const MASTER = resolve(nativeDir, 'store/icon-master.png');

/**
 * آیکون‌های از پیش رندرشده و کامیت‌شده. وجود این پوشه یعنی CI بدون
 * هیچ ابزار گرافیکی می‌تواند آیکون‌ها را سر جایشان بگذارد.
 */
const PRERENDERED = resolve(nativeDir, 'store/icons');

const FORCE_RENDER = process.argv.includes('--render');

/**
 * رنگ پس‌زمینه‌ی adaptive-icon: هم‌رنگ کاشی فیروزه‌ای آیکون، تا در
 * لانچرهایی که آیکون را ماسک می‌کنند، لبه‌ها یکدست دیده شود.
 */
const BG_COLOR = '#0d5c5c';

/** چگالی‌های استاندارد اندروید: پوشه → اندازه‌ی لبه (px) */
const DENSITIES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const S = 1024; // اندازه‌ی آیکون پایه

function sh(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * فایل هنری اصلی حاشیه‌ی سفید دور کاشی دارد. اگر این حاشیه حذف نشود،
 * در آیکون adaptive و maskable به‌شکل یک مربع سفید دور طرح دیده می‌شود.
 * این تابع حاشیه‌ی سفید را می‌بُرد و طرح خالص کاشی را برمی‌گرداند.
 */
function makeArt(out) {
  // ۱) حاشیه‌ی سفید یک‌دست اطراف طرح بریده می‌شود
  const trimmed = resolve(tmp, 'trimmed.png');
  sh('magick', [
    MASTER,
    '-bordercolor',
    'white',
    '-border',
    '2',
    '-fuzz',
    '8%',
    '-trim',
    '+repage',
    trimmed,
  ]);

  // ۲) کاشی گوشه‌های گِرد دارد، پس بعد از trim هنوز چهار مثلث سفید در
  //    گوشه‌ها می‌مانَد. با floodfill از هر گوشه، سفیدی به شفاف تبدیل می‌شود
  //    تا در آیکون adaptive/maskable پس‌زمینه‌ی فیروزه‌ای دیده شود.
  const geo = sh('magick', ['identify', '-format', '%w %h', trimmed]).toString().trim().split(' ');
  const w = Number(geo[0]) - 1;
  const h = Number(geo[1]) - 1;
  sh('magick', [
    trimmed,
    '-alpha',
    'set',
    '-fuzz',
    '12%',
    '-fill',
    'none',
    '-draw',
    'color 0,0 floodfill',
    '-draw',
    `color ${w},0 floodfill`,
    '-draw',
    `color 0,${h} floodfill`,
    '-draw',
    `color ${w},${h} floodfill`,
    out,
  ]);
  return out;
}

/**
 * آیکون پایه‌ی مربعی ۱۰۲۴px از فایل master.
 * فایل master خودش گوشه‌های گِرد و حاشیه‌ی سفید دارد؛ برای آیکون لانچر
 * پس‌زمینه‌ی شفاف حفظ می‌شود تا لانچر خودش ماسک بزند.
 */
function renderBase(art, out) {
  sh('magick', [
    art,
    '-resize',
    `${S}x${S}`,
    '-background',
    'none',
    '-gravity',
    'center',
    '-extent',
    `${S}x${S}`,
    out,
  ]);
}

/**
 * foreground آیکون adaptive: اندروید حدود یک‌سوم لبه را برش می‌زند، پس
 * آیکون باید در «ناحیه‌ی امن» مرکزی (۶۶٪) جای بگیرد وگرنه قاب طلایی و
 * لبه‌های طرح بریده می‌شوند.
 */
function renderForeground(art, out) {
  const inner = Math.round(S * 0.72);
  sh('magick', [
    '-size',
    `${S}x${S}`,
    'xc:none',
    '(',
    art,
    '-resize',
    `${inner}x${inner}`,
    ')',
    '-gravity',
    'center',
    '-composite',
    out,
  ]);
}

/** نسخه‌ی گِرد (ic_launcher_round) با ماسک دایره */
function renderRound(base, out) {
  const mask = resolve(tmp, 'round-mask.png');
  sh('magick', [
    '-size',
    `${S}x${S}`,
    'xc:none',
    '-fill',
    'white',
    '-draw',
    `circle ${S / 2},${S / 2} ${S / 2},0`,
    mask,
  ]);
  // آیکون master روی پس‌زمینه‌ی برند تخت می‌شود تا داخل دایره سفیدی نماند
  const flat = resolve(tmp, 'flat.png');
  sh('magick', [
    '-size',
    `${S}x${S}`,
    `xc:${BG_COLOR}`,
    '(',
    base,
    ')',
    '-gravity',
    'center',
    '-composite',
    flat,
  ]);
  sh('magick', [flat, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', out]);
}

/**
 * آیکون پیش‌فرض کاپاسیتور (وکتور سبز اندروید) حذف می‌شود.
 * `drawable/ic_launcher_background.xml` هم‌نام منبع رنگی ما است و اگر
 * بماند ممکن است aapt2 نسخه‌ی اشتباه را انتخاب کند.
 */
function removeDefaultDrawables() {
  for (const rel of [
    'drawable-v24/ic_launcher_foreground.xml',
    'drawable/ic_launcher_background.xml',
  ]) {
    const f = resolve(androidRes, rel);
    if (existsSync(f)) {
      rmSync(f, { force: true });
      console.log(`🗑️  آیکون پیش‌فرض کاپاسیتور حذف شد: ${rel}`);
    }
  }
}

/** XML آیکون adaptive و رنگ پس‌زمینه — در هر دو حالت لازم است */
function writeAdaptiveXml() {
  removeDefaultDrawables();
  const anydpi = resolve(androidRes, 'mipmap-anydpi-v26');
  mkdirSync(anydpi, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  writeFileSync(resolve(anydpi, 'ic_launcher.xml'), adaptiveXml);
  writeFileSync(resolve(anydpi, 'ic_launcher_round.xml'), adaptiveXml);

  const valuesDir = resolve(androidRes, 'values');
  mkdirSync(valuesDir, { recursive: true });
  writeFileSync(
    resolve(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
`,
  );
  console.log('✅ adaptive-icon XML + رنگ پس‌زمینه نوشته شد.');
}

/**
 * حالت «کپی»: آیکون‌های از پیش رندرشده‌ی کامیت‌شده را سر جایشان می‌گذارد.
 * این مسیر در گیت‌هاب اکشنز استفاده می‌شود، چون رانر ImageMagick ندارد.
 */
function copyPrerendered() {
  let n = 0;
  for (const dir of Object.keys(DENSITIES)) {
    const srcDir = resolve(PRERENDERED, dir);
    if (!existsSync(srcDir)) {
      console.error(`❌ آیکون آماده یافت نشد: ${srcDir}`);
      process.exit(1);
    }
    const outDir = resolve(androidRes, dir);
    mkdirSync(outDir, { recursive: true });
    for (const f of readdirSync(srcDir)) {
      copyFileSync(resolve(srcDir, f), resolve(outDir, f));
      n++;
    }
  }
  console.log(`✅ ${n} آیکون آماده در ${Object.keys(DENSITIES).length} چگالی کپی شد (بدون نیاز به ImageMagick).`);

  writeAdaptiveXml();

  // آیکون‌های PWA از نسخه‌ی آماده
  const pwaDir = resolve(repoRoot, 'packages/app-shell/public/icons');
  if (existsSync(pwaDir)) {
    for (const f of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
      const src = resolve(PRERENDERED, 'pwa', f);
      if (existsSync(src)) copyFileSync(src, resolve(pwaDir, f));
    }
    console.log('✅ آیکون‌های PWA از نسخه‌ی آماده کپی شد.');
  }

  console.log('\n🎉 آیکون‌های برند دُردانه اعمال شد.');
}

function main() {
  if (!existsSync(androidRes)) {
    console.error(`❌ ${androidRes} یافت نشد — اول \`npx cap add android\` را اجرا کنید.`);
    process.exit(1);
  }

  // مسیر پیش‌فرض CI: آیکون‌های آماده هستند و هیچ ابزار گرافیکی لازم نیست
  if (!FORCE_RENDER && existsSync(PRERENDERED)) {
    copyPrerendered();
    return;
  }

  if (!existsSync(MASTER)) {
    console.error(`❌ فایل هنری آیکون یافت نشد: ${MASTER}`);
    console.error('   آیکون اصلی برند باید در native/store/icon-master.png باشد.');
    process.exit(1);
  }

  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const art = makeArt(resolve(tmp, 'art.png'));

  const base = resolve(tmp, 'base-1024.png');
  const baseFg = resolve(tmp, 'base-fg-1024.png');
  const baseRound = resolve(tmp, 'base-round-1024.png');

  renderBase(art, base);
  renderForeground(art, baseFg);
  renderRound(base, baseRound);
  console.log('✅ آیکون پایه از فایل هنری برند (۱۰۲۴px) آماده شد.');

  // آیکون‌های لانچر در همه‌ی چگالی‌ها
  for (const [dir, size] of Object.entries(DENSITIES)) {
    const outDir = resolve(androidRes, dir);
    mkdirSync(outDir, { recursive: true });
    const opt = ['-depth', '8', '-strip'];
    sh('magick', [base, '-resize', `${size}x${size}`, ...opt, resolve(outDir, 'ic_launcher.png')]);
    sh('magick', [
      baseRound,
      '-resize',
      `${size}x${size}`,
      ...opt,
      resolve(outDir, 'ic_launcher_round.png'),
    ]);
    sh('magick', [
      baseFg,
      '-resize',
      `${size}x${size}`,
      ...opt,
      resolve(outDir, 'ic_launcher_foreground.png'),
    ]);
  }
  console.log(`✅ آیکون اندروید در ${Object.keys(DENSITIES).length} چگالی تولید شد.`);

  // adaptive icon (اندروید ۸+)
  writeAdaptiveXml();

  // آیکون فروشگاه (بازار/مایکت: ۵۱۲×۵۱۲ PNG، بدون شفافیت)
  const storeDir = resolve(nativeDir, 'store');
  mkdirSync(storeDir, { recursive: true });
  sh('magick', [
    art,
    '-resize',
    '512x512',
    '-background',
    'white',
    '-alpha',
    'remove',
    '-alpha',
    'off',
    resolve(storeDir, 'icon-512.png'),
  ]);
  console.log('✅ آیکون فروشگاه (۵۱۲px) ساخته شد: native/store/icon-512.png');

  // آیکون‌های PWA
  const pwaDir = resolve(repoRoot, 'packages/app-shell/public/icons');
  if (existsSync(pwaDir)) {
    sh('magick', [base, '-resize', '192x192', '-depth', '8', '-strip', resolve(pwaDir, 'icon-192.png')]);
    sh('magick', [base, '-resize', '512x512', '-depth', '8', '-strip', resolve(pwaDir, 'icon-512.png')]);
    // maskable: طرح داخل ناحیه‌ی امن، پس‌زمینه‌ی برند تخت
    sh('magick', [
      '-size',
      '512x512',
      `xc:${BG_COLOR}`,
      '(',
      art,
      '-resize',
      '368x368',
      ')',
      '-gravity',
      'center',
      '-composite',
      '-depth',
      '8',
      '-strip',
      resolve(pwaDir, 'icon-512-maskable.png'),
    ]);
    console.log('✅ آیکون‌های PWA به‌روزرسانی شد.');
  }

  // ذخیره‌ی نسخه‌ی آماده برای CI — تا گیت‌هاب اکشنز به ImageMagick نیاز نداشته باشد
  exportPrerendered();

  rmSync(tmp, { recursive: true, force: true });
  console.log('\n🎉 تولید آیکون از فایل هنری برند کامل شد.');
  console.log('   نسخه‌ی آماده در native/store/icons ذخیره شد — این پوشه باید کامیت شود.');
}

/**
 * آیکون‌های تولیدشده را در native/store/icons کپی می‌کند تا کامیت شوند.
 * گیت‌هاب اکشنز فقط همین‌ها را کپی می‌کند (رانر magick ندارد).
 */
function exportPrerendered() {
  for (const dir of Object.keys(DENSITIES)) {
    const outDir = resolve(PRERENDERED, dir);
    mkdirSync(outDir, { recursive: true });
    for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      copyFileSync(resolve(androidRes, dir, f), resolve(outDir, f));
    }
  }
  const pwaSrc = resolve(repoRoot, 'packages/app-shell/public/icons');
  if (existsSync(pwaSrc)) {
    const outPwa = resolve(PRERENDERED, 'pwa');
    mkdirSync(outPwa, { recursive: true });
    for (const f of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
      const src = resolve(pwaSrc, f);
      if (existsSync(src)) copyFileSync(src, resolve(outPwa, f));
    }
  }
  console.log('✅ نسخه‌ی آماده‌ی آیکون‌ها در native/store/icons ذخیره شد.');
}

main();
