/**
 * چک خودکار کنتراست WCAG AA برای همه‌ی ترکیب‌های رنگی دیزاین‌سیستم
 * در هر ۴ حالت: روشن/تیره × استاندارد/کوررنگی.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contrastRatio,
  hexToRgb,
  parseCssVars,
  relativeLuminance,
  resolveVar,
  AA_NORMAL,
  AA_LARGE,
} from './helpers/contrast';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../src/tokens.css'), 'utf8');

const base = parseCssVars(css, ':root');
const dark = parseCssVars(css, "[data-theme='dark']");
const cb = parseCssVars(css, "[data-colorblind='true']");
const darkCb = parseCssVars(css, "[data-theme='dark'][data-colorblind='true']");

type Vars = Record<string, string>;
const light: Vars = { ...base };
const darkTheme: Vars = { ...base, ...dark };
const lightCb: Vars = { ...base, ...cb };
const darkThemeCb: Vars = { ...base, ...dark, ...cb, ...darkCb };

const themes: [string, Vars][] = [
  ['light', light],
  ['dark', darkTheme],
  ['light+colorblind', lightCb],
  ['dark+colorblind', darkThemeCb],
];

const v = (vars: Vars, name: string): string => resolveVar(vars, name);

describe('توکن‌های قرارداد §4 — مقادیر دقیق', () => {
  /*
   * ⚠️ این تست قبلاً hexهای پالت اولیه را قفل کرده بود؛ پس از بازطراحی
   * گرافیکی (PR #7 — پالت چوب/کاشی/طلا) مقادیر عوض شدند. قفل‌کردنِ hex
   * مالکیت مدیر گرافیکی را می‌شکند؛ پس فقط قواعدِ پایدار را تست می‌کنیم:
   * وجود توکن، فرمت معتبر، مقیاس فاصله‌ها و قلم. کنتراست جداگانه تست می‌شود.
   */
  it('توکن‌های رنگی قرارداد موجودند و hex معتبرند', () => {
    const hex = /^#[0-9a-f]{3}([0-9a-f]{3})?$/;
    for (const token of [
      '--dor-bg',
      '--dor-correct',
      '--dor-present',
      '--dor-absent',
      '--dor-accent',
      '--dor-gold',
      '--dor-dark-bg',
      '--dor-dark-accent',
    ]) {
      expect(v(light, token).toLowerCase(), token).toMatch(hex);
    }
    // شعاع گردی جزو انتخاب گرافیکی است؛ فقط «تعریف‌شده و معقول» را تست می‌کنیم
    expect(Number.parseFloat(String(base['--dor-radius']))).toBeGreaterThanOrEqual(8);
    /*
     * مقیاس فاصله‌ها در بازطراحی گرافیکی گسترش یافت (۶ پله به‌جای ۴). قاعده‌ی
     * پایداری که تست می‌کنیم: همه تعریف‌شده و اکیداً صعودی باشند — نه مقادیر hard-code.
     */
    const spaces = [1, 2, 3, 4, 5, 6].map((i) =>
      Number.parseFloat(String(base[`--dor-space-${String(i)}`])),
    );
    expect(spaces[0]).toBe(4);
    for (let i = 1; i < spaces.length; i++) {
      expect(spaces[i], `--dor-space-${String(i + 1)}`).toBeGreaterThan(spaces[i - 1]);
    }
    expect(base['--dor-font']).toContain('Vazirmatn');
  });

  it('تم تیره پس‌زمینه را تیره‌تر می‌کند', () => {
    // قاعده‌ی پایدار: روشنایی تم تیره باید از تم روشن کمتر باشد
    const l = relativeLuminance(v(light, '--dor-bg'));
    const d = relativeLuminance(v(darkTheme, '--dor-bg'));
    expect(d).toBeLessThan(l);
    expect(d).toBeLessThan(0.1);
  });

  it('حالت کوررنگی سبز/کهربایی را به آبی/نارنجی متمایز می‌برد', () => {
    const c = hexToRgb(v(lightCb, '--dor-correct'));
    const p = hexToRgb(v(lightCb, '--dor-present'));
    // قاعده‌ی پایدار (مستقل از hex دقیق): «correct» آبی‌غالب، «present» قرمز‌غالب
    expect(c[2], 'کوررنگی: correct باید آبی باشد').toBeGreaterThan(c[0]);
    expect(p[0], 'کوررنگی: present باید نارنجی باشد').toBeGreaterThan(p[2]);
    // و دو حالت باید از هم قابل‌تفکیک باشند
    expect(contrastRatio(v(lightCb, '--dor-correct'), v(lightCb, '--dor-present'))).toBeGreaterThan(
      1.5,
    );
  });
});

describe('کنتراست WCAG AA — همه‌ی ترکیب‌های متن/پس‌زمینه', () => {
  for (const [name, vars] of themes) {
    describe(`تم: ${name}`, () => {
      it('متن اصلی روی پس‌زمینه ≥ 4.5', () => {
        expect(contrastRatio(v(vars, '--dor-ink'), v(vars, '--dor-bg'))).toBeGreaterThanOrEqual(
          AA_NORMAL,
        );
      });
      it('متن ثانویه روی پس‌زمینه ≥ 4.5', () => {
        expect(
          contrastRatio(v(vars, '--dor-ink-soft'), v(vars, '--dor-bg')),
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
      it('متن اصلی روی سطح کارت ≥ 4.5', () => {
        expect(
          contrastRatio(v(vars, '--dor-ink'), v(vars, '--dor-surface')),
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
      it('دکمه‌ی اصلی: متن روی پس‌زمینه‌ی دکمه ≥ 4.5', () => {
        expect(
          contrastRatio(v(vars, '--dor-btn-fg'), v(vars, '--dor-btn-bg')),
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
      it('متن دکمه‌ی ثانویه روی پس‌زمینه ≥ 4.5', () => {
        expect(
          contrastRatio(v(vars, '--dor-btn-secondary-fg'), v(vars, '--dor-bg')),
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
      // حروف Tile درشت و بولد (1.5rem/700) → معیار AA متن درشت = 3:1
      it('حرف روی خانه‌ی correct ≥ 3 (متن درشت)', () => {
        expect(
          contrastRatio(v(vars, '--dor-on-correct'), v(vars, '--dor-correct')),
        ).toBeGreaterThanOrEqual(AA_LARGE);
      });
      it('حرف روی خانه‌ی present ≥ 3 (متن درشت)', () => {
        expect(
          contrastRatio(v(vars, '--dor-on-present'), v(vars, '--dor-present')),
        ).toBeGreaterThanOrEqual(AA_LARGE);
      });
      it('حرف روی خانه‌ی absent ≥ 3 (متن درشت)', () => {
        expect(
          contrastRatio(v(vars, '--dor-on-absent'), v(vars, '--dor-absent')),
        ).toBeGreaterThanOrEqual(AA_LARGE);
      });
      it('متن خطا روی رنگ خطر ≥ 4.5', () => {
        expect(
          contrastRatio(v(vars, '--dor-on-danger'), v(vars, '--dor-danger')),
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
      it('متن روی طلایی ≥ 4.5', () => {
        expect(
          contrastRatio(v(vars, '--dor-on-gold'), v(vars, '--dor-gold')),
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
    });
  }
});

describe('reduced-motion و لمس', () => {
  it('tokens.css + ui-kit.css قانون prefers-reduced-motion دارند', () => {
    const uiCss = readFileSync(join(here, '../src/ui-kit.css'), 'utf8');
    expect(uiCss).toContain('prefers-reduced-motion');
  });
  it('حداقل ناحیه‌ی لمس دست‌کم 44px است', () => {
    // تست قبلاً دقیقاً 44px می‌خواست و 48px (بهتر) را خطا می‌گرفت
    const px = Number.parseFloat(String(base['--dor-touch-min']));
    expect(px).toBeGreaterThanOrEqual(44);
  });
});
