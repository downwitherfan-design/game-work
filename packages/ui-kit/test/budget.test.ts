/**
 * بودجه‌ی حجم پکیج (خط قرمز ۲۳ + DoD پرامپت AI-04):
 *  - سهم ui-kit از باندل ≤ 150KB gzip (بدون فونت) — سنجش سورس TS/TSX/CSS/JSON gzip‌شده
 *    (تقریب محافظه‌کارانه: باندل مینیفای‌شده همیشه کوچک‌تر از سورس است).
 *  - فونت‌ها (regular+bold woff2) مجموعاً ≤ 120KB.
 *  - منطق Confetti ≤ 3KB gzip.
 *  - هیچ فایل باینری > 500KB (خط قرمز ۱۰).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '../src');

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const BUNDLE_EXT = new Set(['.ts', '.tsx', '.css', '.json']);

describe('بودجه‌ی حجم — budget as code', () => {
  it('کد + استایل (بدون فونت) ≤ 150KB gzip', () => {
    let total = 0;
    for (const f of walk(srcDir)) {
      if (BUNDLE_EXT.has(extname(f))) {
        total += gzipSync(readFileSync(f)).length;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(150 * 1024);
  });

  it('فونت‌های woff2 مجموعاً ≤ 120KB', () => {
    const fontDir = join(srcDir, 'fonts');
    const fonts = readdirSync(fontDir).filter((f) => f.endsWith('.woff2'));
    expect(fonts.length).toBeGreaterThanOrEqual(2); // regular + bold
    const total = fonts.reduce((s, f) => s + statSync(join(fontDir, f)).size, 0);
    expect(total).toBeLessThanOrEqual(120 * 1024);
  });

  it('منطق Confetti ≤ 3KB gzip', () => {
    const gz = gzipSync(readFileSync(join(srcDir, 'components/Confetti.tsx'))).length;
    expect(gz).toBeLessThanOrEqual(3 * 1024);
  });

  it('هیچ فایلی در پکیج > 500KB نیست (خط قرمز ۱۰)', () => {
    for (const f of walk(srcDir)) {
      expect(statSync(f).size, f).toBeLessThanOrEqual(500 * 1024);
    }
  });

  it('هیچ import خارج از preact/@dordaneh/contracts/نسبی نیست (مرز وابستگی)', () => {
    const allowed = /^(preact(\/.+)?|@dordaneh\/contracts|\.{1,2}\/.+)$/;
    for (const f of walk(srcDir)) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const code = readFileSync(f, 'utf8');
      for (const m of code.matchAll(/from\s+'([^']+)'/g)) {
        expect(m[1], `${f}: ${m[1]}`).toMatch(allowed);
      }
    }
  });

  it('هیچ رنگ hex هاردکد در کامپوننت‌ها نیست (خط قرمز ۲۵ — رنگ فقط از توکن)', () => {
    for (const f of walk(join(srcDir, 'components'))) {
      const code = readFileSync(f, 'utf8');
      // استثنا: فالبک خنثی Confetti برای وقتی توکن در دسترس نیست
      const hexes = [...code.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
        .map((m) => m[0])
        .filter((h) => h !== '#888888');
      expect(hexes, `${f}: ${hexes.join(',')}`).toEqual([]);
    }
  });
});

describe('فونت آفلاین-اول', () => {
  it('tokens.css فونت را از فایل محلی لود می‌کند نه CDN', () => {
    const css = readFileSync(join(srcDir, 'tokens.css'), 'utf8');
    expect(css).toContain("url('./fonts/Vazirmatn-Regular-sub.woff2')");
    expect(css).toContain("url('./fonts/Vazirmatn-Bold-sub.woff2')");
    expect(css).not.toMatch(/https?:\/\//);
  });
});
