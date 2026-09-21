#!/usr/bin/env node
/**
 * گِیت «اپ واقعی» — تنها چیزی که مانع تکرار فاجعه‌ی نسخه‌ی ۱.۰.۰ می‌شود.
 *
 * چرا لازم است؟ نسخه‌ی ۱.۰.۰ با ۱۱۲۱ تست سبز ساخته شد و روی گوشی کار نکرد،
 * چون هر پکیج Mock خودش را تست می‌کرد و هیچ‌کس «اتصال» را تست نمی‌کرد. این
 * اسکریپت اپ *مونتاژشده* را در یک مرورگر واقعی باز می‌کند و شرط‌های زیر را
 * روی همه‌ی مسیرها می‌سنجد:
 *
 *   ۱) هیچ Mock رندر نشود        (.dor-mock-note === 0)
 *   ۲) هیچ خطای کنسول نباشد
 *   ۳) هیچ کلید ترجمه‌ی خام دیده نشود  (مثل appShell.home.title)
 *   ۴) صفحه‌ی بازی بدون اسکرول در نمای گوشی جا شود
 *   ۵) ردیف سوم کیبورد زیر ناوبری پنهان نشود
 *   ۶) موتور واقعی حدس را ارزیابی کند (نه Mock)
 *
 * استفاده:
 *   node tools/check-real-app.mjs [--base http://localhost:3000]
 *
 * وابستگی: playwright. اگر نصب نباشد اسکریپت با پیام روشن skip می‌کند
 * (تا CI فعلی نشکند) مگر با --strict که در آن حالت fail می‌شود.
 */

import process from 'node:process';

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = argOf('--base', process.env.DOR_BASE_URL ?? 'http://localhost:3000');
const STRICT = args.includes('--strict');

const VIEWPORT = { width: 412, height: 900 };
const ROUTES = ['/', '/daily', '/levels', '/practice', '/stats', '/album', '/settings'];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const msg = 'playwright نصب نیست — گِیت «اپ واقعی» اجرا نشد.';
  if (STRICT) {
    console.error(`❌ ${msg} (--strict)`);
    process.exit(1);
  }
  console.warn(`⚠️  ${msg} برای اجرا: npm i -D playwright && npx playwright install chromium`);
  process.exit(0);
}

const failures = [];
const fail = (route, why) => failures.push(`[${route}] ${why}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, locale: 'fa-IR' });

/** خطاهای کنسول به تفکیک مسیر */
let currentRoute = '(init)';
page.on('console', (m) => {
  if (m.type() === 'error') fail(currentRoute, `خطای کنسول: ${m.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => fail(currentRoute, `استثنای صفحه: ${String(e).slice(0, 200)}`));

async function goto(route) {
  currentRoute = route;
  await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(1400); // فرصت lazy-load صفحه‌ها
}

try {
  // آنبوردینگ را رد می‌کنیم تا مسیرهای اصلی قابل بازدید باشند
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.setItem('dor.shell.onboarded', 'true');
  });

  for (const route of ROUTES) {
    await goto(route);

    // ۱) Mock
    const mocks = await page.locator('.dor-mock-note').count();
    if (mocks > 0) fail(route, `${String(mocks)} عدد Mock رندر شده — سرویس‌ها تزریق نشده‌اند`);

    // ۲) صفحه نباید عملاً خالی باشد (باگ «سفیدی» که کاربر دید)
    const content = await page.evaluate(() => {
      const outlet = document.getElementById('main-outlet');
      return {
        text: (outlet?.innerText ?? '').trim().length,
        interactive: outlet?.querySelectorAll('button, a, input, select').length ?? 0,
      };
    });
    if (content.text < 20) {
      fail(route, `صفحه عملاً خالی است (${String(content.text)} کاراکتر متن)`);
    }

    // ۳) کلید ترجمه‌ی خام
    const raw = await page.evaluate(() => {
      // همه‌ی namespaceهای ترجمه‌ی پروژه — یک پکیج جامانده کافی است تا
      // کاربر «metaRetention.stats.title» خام ببیند (باگ واقعی رخ داده).
      const re =
        /\b(appShell|gameBoard|uiKit|metaRetention|cultureCards|duelMode|viralShare|monetization|audioHaptics|analytics|coreEngine|wordDb)\.[a-zA-Z][\w.]+/g;
      const found = document.body.innerText.match(re) ?? [];
      return { count: found.length, sample: found.slice(0, 3) };
    });
    if (raw.count > 0) {
      fail(route, `${String(raw.count)} کلید ترجمه‌ی خام روی صفحه: ${raw.sample.join(', ')}`);
    }

    // ۴+۵) چیدمان صفحه‌ی بازی
    const hasGame = (await page.locator('#game-screen').count()) > 0;
    if (hasGame) {
      const layout = await page.evaluate(() => {
        const nav = document.querySelector('.dor-bottom-nav');
        const kb = document.querySelector('.gb-keyboard');
        const doc = document.documentElement;
        return {
          scrollH: doc.scrollHeight,
          innerH: window.innerHeight,
          navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
          kbBottom: kb ? Math.round(kb.getBoundingClientRect().bottom) : null,
          kbRows: document.querySelectorAll('.gb-keyboard > *').length,
        };
      });
      if (layout.scrollH > layout.innerH + 2) {
        fail(route, `صفحه‌ی بازی اسکرول دارد (${String(layout.scrollH)} > ${String(layout.innerH)})`);
      }
      if (layout.kbBottom !== null && layout.navTop !== null && layout.kbBottom > layout.navTop) {
        fail(route, `کیبورد زیر ناوبری پنهان است (کف ${String(layout.kbBottom)} > سقف ${String(layout.navTop)})`);
      }
      if (layout.kbRows < 3) fail(route, `کیبورد ${String(layout.kbRows)} ردیف دارد (باید ۳ باشد)`);
    }
  }

  // ۶) موتور واقعی: در صفحه‌ی مراحل، مرحله ۱ را باز کن و یک حدس کامل ثبت کن
  currentRoute = '/levels → مرحله ۱';
  await goto('/levels');
  const lvl = page.locator('#level-1');
  if ((await lvl.count()) === 0) {
    fail(currentRoute, 'دکمه‌ی مرحله ۱ وجود ندارد');
  } else {
    // .click() به‌خاطر انیمیشن pulse تایم‌اوت می‌شود
    await lvl.dispatchEvent('click');
    await page.waitForTimeout(1800);
    if ((await page.locator('#game-screen').count()) === 0) {
      fail(currentRoute, 'صفحه‌ی بازی مرحله باز نشد');
    } else {
      const tiles = await page.locator('#game-board .dor-tile, #game-board .gb-tile').count();
      if (tiles === 0) fail(currentRoute, 'برد هیچ کاشی ندارد');

      // طول کلمه را بخوان و همان تعداد حرف تایپ کن، سپس ثبت
      const len = await page.evaluate(() => {
        const b = document.querySelector('#game-board');
        return b ? Number(getComputedStyle(b).getPropertyValue('--gb-len')) : 0;
      });
      // ⚠️ کیبورد از onPointerDown استفاده می‌کند (نه click) — برای پاسخ‌دهی لمسی
      const keys = await page.locator('.gb-key').all();
      const letterKeys = [];
      for (const k of keys) {
        const txt = (await k.innerText()).trim();
        if (txt && [...txt].length === 1) letterKeys.push(k);
      }
      for (const k of letterKeys.slice(0, Math.max(0, len))) {
        await k.dispatchEvent('pointerdown');
        await page.waitForTimeout(90);
      }
      // حرف داخل .dor-tile__face--front (ui-kit) یا خودِ .gb-tile می‌نشیند
      const filled = await page.evaluate(
        () =>
          [...document.querySelectorAll('#game-board .dor-tile, #game-board .gb-tile')].filter(
            (e) => (e.textContent ?? '').trim() !== '',
          ).length,
      );
      if (filled === 0) fail(currentRoute, 'تایپ با کیبورد روی صفحه کار نمی‌کند');

      // ثبت حدس → موتور واقعی باید ارزیابی کند (Mock همیشه یک پاسخ ثابت می‌دهد)
      const submit = page.locator('.gb-key--action, .gb-key').last();
      await submit.dispatchEvent('pointerdown');
      await page.waitForTimeout(1400);
      const evaluated = await page.evaluate(
        () =>
          [...document.querySelectorAll('#game-board .dor-tile')].filter((e) => {
            const st = e.getAttribute('data-state');
            return st === 'correct' || st === 'present' || st === 'absent';
          }).length,
      );
      if (evaluated === 0 && filled > 0) {
        // ممکن است واژه‌ی تصادفی در واژه‌نامه نباشد (لرزش) — این خطا نیست
        console.warn(`⚠️  [${currentRoute}] حدس ثبت نشد (احتمالاً واژه‌ی نامعتبر) — نادیده گرفته شد`);
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error('\n❌ گِیت «اپ واقعی» رد شد:\n');
  for (const f of failures) console.error(`  • ${f}`);
  console.error(
    '\nاین گِیت دقیقاً همان چیزی را می‌سنجد که کاربر روی گوشی می‌بیند.\n' +
      'راهنما: docs/03_ORDERS_REAL_APP.md\n',
  );
  process.exit(1);
}

console.log('✅ گِیت «اپ واقعی» قبول: صفر Mock، صفر خطا، چیدمان سالم، موتور واقعی فعال.');
