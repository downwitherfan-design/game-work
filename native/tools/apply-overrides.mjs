#!/usr/bin/env node
/**
 * پس از `npx cap add android` / `cap sync android` اجرا شود.
 * ۱) intent-filter های دیپ‌لینک را داخل MainActivity تزریق می‌کند.
 * ۲) بهینه‌سازی حجم را در app/build.gradle فعال می‌کند:
 *    minifyEnabled + shrinkResources + حذف ABI های غیرلازم.
 * ۳) قواعد ProGuard/R8 را کپی می‌کند تا مینیفای، پل جاوااسکریپت کاپاسیتور را
 *    نشکند (بدون این مرحله نسخه‌ی release با صفحه‌ی سفید بالا می‌آید).
 * idempotent است — اجرای چندباره امن است.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const androidDir = resolve(here, '..', 'android');

function patchManifest() {
  const manifestPath = resolve(androidDir, 'app/src/main/AndroidManifest.xml');
  if (!existsSync(manifestPath)) {
    console.error(`❌ ${manifestPath} یافت نشد — اول \`npx cap add android\` را اجرا کنید.`);
    process.exit(1);
  }
  let xml = readFileSync(manifestPath, 'utf8');
  if (xml.includes('android:host="dordaneh.ir"')) {
    console.log('ℹ️ intent-filter ها قبلاً اعمال شده‌اند.');
    return;
  }
  const filters = `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="dordaneh.ir" android:pathPrefix="/d/" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="dordaneh" />
            </intent-filter>
`;
  // تزریق قبل از بسته‌شدن تگ activity اصلی
  const activityClose = /(<activity[\s\S]*?MainActivity[\s\S]*?)(<\/activity>)/;
  if (!activityClose.test(xml)) {
    console.error('❌ MainActivity در Manifest پیدا نشد.');
    process.exit(1);
  }
  xml = xml.replace(activityClose, `$1${filters}            $2`);
  writeFileSync(manifestPath, xml);
  console.log('✅ intent-filter های دیپ‌لینک اعمال شد.');
}

function patchBuildGradle() {
  const gradlePath = resolve(androidDir, 'app/build.gradle');
  if (!existsSync(gradlePath)) {
    console.error(`❌ ${gradlePath} یافت نشد.`);
    process.exit(1);
  }
  let g = readFileSync(gradlePath, 'utf8');
  if (g.includes('shrinkResources true')) {
    console.log('ℹ️ بهینه‌سازی حجم قبلاً اعمال شده است.');
    return;
  }
  // release: minify + shrink
  g = g.replace(
    /release\s*\{[^}]*\}/,
    `release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }`,
  );
  // فقط ABI های رایج ایران (حذف x86/x86_64 و mips)
  g = g.replace(
    /defaultConfig\s*\{/,
    `defaultConfig {
        ndk { abiFilters 'arm64-v8a', 'armeabi-v7a' }`,
  );
  writeFileSync(gradlePath, g);
  console.log('✅ minifyEnabled + shrinkResources + abiFilters اعمال شد.');
}

/**
 * قواعد ProGuard را روی پروژه‌ی اندروید کپی می‌کند.
 * حیاتی است چون build.gradle مینیفای را فعال کرده و R8 بدون این قواعد
 * کلاس‌های کاپاسیتور و متدهای @JavascriptInterface را حذف می‌کند.
 */
function patchProguard() {
  const src = resolve(here, '..', 'android-overrides/app/proguard-rules.pro');
  const dest = resolve(androidDir, 'app/proguard-rules.pro');
  if (!existsSync(src)) {
    console.error(`❌ ${src} یافت نشد.`);
    process.exit(1);
  }
  if (!existsSync(dirname(dest))) {
    console.error(`❌ ${dirname(dest)} یافت نشد — اول \`npx cap add android\` را اجرا کنید.`);
    process.exit(1);
  }
  const current = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
  if (current.includes('com.getcapacitor')) {
    console.log('ℹ️ قواعد ProGuard قبلاً اعمال شده‌اند.');
    return;
  }
  copyFileSync(src, dest);
  console.log('✅ قواعد ProGuard/R8 محافظ پل کاپاسیتور اعمال شد.');
}

patchManifest();
patchBuildGradle();
patchProguard();
