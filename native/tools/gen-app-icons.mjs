#!/usr/bin/env node
/**
 * تولید آیکون رسمی اپ دُردانه برای اندروید، PWA و صفحه‌ی فروشگاه‌ها.
 *
 * چرا لازم است: آیکون پیش‌فرض کاپاسیتور (ربات سبز اندروید) توسط بازار و
 * مایکت رد می‌شود و آیکون‌های موجود در native/store هم فقط placeholder
 * تک‌رنگ بودند (بدون لوگو).
 *
 * طرح آیکون — بر پایه‌ی توکن‌های رسمی packages/ui-kit/src/tokens.css:
 *   - پس‌زمینه: گرادیان فیروزه‌ای (--dor-accent #1ca9a6 → تیره‌تر)
 *   - نشانه: حرف «د» با فونت رسمی برند (وزیرمتن Bold)
 *   - حاشیه‌ی طلایی نازک (--dor-gold #d4af37)
 *
 * خروجی‌ها:
 *   - آیکون لانچر در ۵ چگالی mipmap (عادی + گِرد + foreground)
 *   - adaptive-icon XML برای اندروید ۸+
 *   - آیکون ۵۱۲×۵۱۲ فروشگاه (native/store/icon-512.png)
 *   - آیکون‌های PWA در packages/app-shell/public/icons
 *
 * اجرا: node native/tools/gen-app-icons.mjs   (از ریشه‌ی native/)
 * پیش‌نیاز: ImageMagick (magick) و پایتون با fontTools+brotli (woff2 → ttf).
 * اگر تبدیل فونت ممکن نبود، به فونت نستعلیق/نسخ سیستم افت می‌کند.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nativeDir = resolve(here, '..');
const repoRoot = resolve(nativeDir, '..');
const androidRes = resolve(nativeDir, 'android/app/src/main/res');
const tmp = resolve(nativeDir, '.icon-tmp');

// توکن‌های رنگ برند
const ACCENT = '#1ca9a6'; // --dor-accent
const ACCENT_DARK = '#12807e';
const GOLD = '#d4af37'; // --dor-gold
// نشانه‌ی برند: «د» تنها. اعراب (ضمّه) در اندازه‌های کوچک لانچر خوانا نیست
// و جدا از حرف می‌افتد، پس در آیکون حذف شده است.
const GLYPH = 'د';

/** چگالی‌های استاندارد اندروید: پوشه → اندازه‌ی لبه (px) */
const DENSITIES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

function sh(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
}

/** وزیرمتن Bold را از woff2 به ttf تبدیل می‌کند (ImageMagick woff2 نمی‌خواند) */
function prepareFont() {
  const woff2 = resolve(repoRoot, 'packages/ui-kit/src/fonts/Vazirmatn-Bold-sub.woff2');
  const ttf = resolve(tmp, 'Vazirmatn-Bold.ttf');
  if (!existsSync(woff2)) return null;
  try {
    sh('python3', [
      '-c',
      `from fontTools.ttLib import TTFont\nf=TTFont(r"${woff2}")\nf.flavor=None\nf.save(r"${ttf}")`,
    ]);
    console.log('✅ فونت وزیرمتن برای رندر آماده شد.');
    return ttf;
  } catch {
    console.log('⚠️ تبدیل فونت ناموفق بود — فونت جایگزین سیستم استفاده می‌شود.');
    // فونت عربی سیستم به‌عنوان جایگزین
    for (const f of [
      '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ]) {
      if (existsSync(f)) return f;
    }
    return null;
  }
}

/**
 * آیکون پایه ۱۰۲۴px می‌سازد.
 * @param {boolean} fullBleed برای foreground آیکون adaptive (بدون حاشیه، حرف
 *        کوچک‌تر چون اندروید حدود یک‌سوم لبه را برش می‌زند)
 */
function renderBase(out, font, fullBleed = false) {
  const S = 1024;
  const glyphPath = resolve(tmp, fullBleed ? 'glyph-fg.png' : 'glyph-bg.png');

  // ۱) حرف را جداگانه روی بوم شفاف رندر و trim می‌کنیم تا مرکز نوری واقعی آن
  //    به‌دست بیاید. (annotate با gravity، خط پایه‌ی فونت را وسط می‌گذارد نه
  //    خودِ حرف را؛ نتیجه‌اش آیکون نامتعادل است.)
  const glyphArgs = ['-background', 'none', '-fill', 'white'];
  if (font) glyphArgs.push('-font', font);
  glyphArgs.push('-pointsize', '900', `label:${GLYPH}`, '-trim', '+repage', glyphPath);
  sh('magick', glyphArgs);

  // ۲) پس‌زمینه‌ی گرادیان برند
  const bgPath = resolve(tmp, fullBleed ? 'bg-fg.png' : 'bg-bg.png');
  const bgArgs = ['-size', `${S}x${S}`, `gradient:${ACCENT}-${ACCENT_DARK}`];
  if (!fullBleed) {
    // حاشیه‌ی طلایی نازک دور آیکون
    bgArgs.push(
      '-stroke',
      GOLD,
      '-strokewidth',
      '12',
      '-fill',
      'none',
      '-draw',
      `roundrectangle 24,24 ${S - 24},${S - 24} 140,140`,
    );
  }
  bgArgs.push(bgPath);
  sh('magick', bgArgs);

  // ۳) ترکیب: حرف را مقیاس و دقیقاً وسط می‌چینیم
  const glyphBox = fullBleed ? Math.round(S * 0.4) : Math.round(S * 0.56);
  sh('magick', [
    bgPath,
    '(',
    glyphPath,
    '-resize',
    `${glyphBox}x${glyphBox}`,
    ')',
    '-gravity',
    'center',
    '-composite',
    out,
  ]);
}

/** نسخه‌ی گِرد (ic_launcher_round) با ماسک دایره */
function renderRound(base, out) {
  const S = 1024;
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
  sh('magick', [base, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', out]);
}

function main() {
  if (!existsSync(androidRes)) {
    console.error(`❌ ${androidRes} یافت نشد — اول \`npx cap add android\` را اجرا کنید.`);
    process.exit(1);
  }
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const font = prepareFont();

  const base = resolve(tmp, 'base-1024.png');
  const baseFg = resolve(tmp, 'base-fg-1024.png');
  const baseRound = resolve(tmp, 'base-round-1024.png');
  renderBase(base, font, false);
  renderBase(baseFg, font, true);
  renderRound(base, baseRound);
  console.log('✅ آیکون پایه (۱۰۲۴px) رندر شد.');

  // آیکون‌های لانچر در همه‌ی چگالی‌ها
  for (const [dir, size] of Object.entries(DENSITIES)) {
    const outDir = resolve(androidRes, dir);
    mkdirSync(outDir, { recursive: true });
    sh('magick', [base, '-resize', `${size}x${size}`, resolve(outDir, 'ic_launcher.png')]);
    sh('magick', [
      baseRound,
      '-resize',
      `${size}x${size}`,
      resolve(outDir, 'ic_launcher_round.png'),
    ]);
    sh('magick', [
      baseFg,
      '-resize',
      `${size}x${size}`,
      resolve(outDir, 'ic_launcher_foreground.png'),
    ]);
  }
  console.log(`✅ آیکون اندروید در ${Object.keys(DENSITIES).length} چگالی تولید شد.`);

  // adaptive icon (اندروید ۸+)
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
    <color name="ic_launcher_background">${ACCENT}</color>
</resources>
`,
  );
  console.log('✅ adaptive-icon XML + رنگ پس‌زمینه نوشته شد.');

  // آیکون فروشگاه (بازار/مایکت: ۵۱۲×۵۱۲ PNG)
  const storeDir = resolve(nativeDir, 'store');
  mkdirSync(storeDir, { recursive: true });
  sh('magick', [base, '-resize', '512x512', resolve(storeDir, 'icon-512.png')]);
  console.log('✅ آیکون فروشگاه (۵۱۲px) ساخته شد: native/store/icon-512.png');

  // آیکون‌های PWA
  const pwaDir = resolve(repoRoot, 'packages/app-shell/public/icons');
  if (existsSync(pwaDir)) {
    sh('magick', [base, '-resize', '192x192', resolve(pwaDir, 'icon-192.png')]);
    sh('magick', [base, '-resize', '512x512', resolve(pwaDir, 'icon-512.png')]);
    sh('magick', [baseFg, '-resize', '512x512', resolve(pwaDir, 'icon-512-maskable.png')]);
    console.log('✅ آیکون‌های PWA به‌روزرسانی شد.');
  }

  rmSync(tmp, { recursive: true, force: true });
  console.log('\n🎉 تولید آیکون کامل شد.');
}

main();
