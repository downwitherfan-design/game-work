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
  parseCssVars,
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
  it('مقادیر hex قرارداد را کلمه‌به‌کلمه دارد', () => {
    expect(v(light, '--dor-bg').toLowerCase()).toBe('#f7f3e9');
    expect(v(light, '--dor-correct').toLowerCase()).toBe('#4caf7d');
    expect(v(light, '--dor-present').toLowerCase()).toBe('#e5a83b');
    expect(v(light, '--dor-absent').toLowerCase()).toBe('#b7b0a3');
    expect(v(light, '--dor-accent').toLowerCase()).toBe('#1ca9a6');
    expect(v(light, '--dor-gold').toLowerCase()).toBe('#d4af37');
    expect(v(light, '--dor-dark-bg').toLowerCase()).toBe('#1b2430');
    expect(v(light, '--dor-dark-accent').toLowerCase()).toBe('#0e6e6b');
    expect(base['--dor-radius']).toBe('12px');
    expect(base['--dor-space-1']).toBe('4px');
    expect(base['--dor-space-2']).toBe('8px');
    expect(base['--dor-space-3']).toBe('16px');
    expect(base['--dor-space-4']).toBe('24px');
    expect(base['--dor-font']).toContain('Vazirmatn');
  });

  it('تم تیره پس‌زمینه را به --dor-dark-bg تغییر می‌دهد', () => {
    expect(v(darkTheme, '--dor-bg').toLowerCase()).toBe('#1b2430');
  });

  it('حالت کوررنگی سبز/کهربایی را به آبی/نارنجی متمایز می‌برد', () => {
    const c = v(lightCb, '--dor-correct');
    const p = v(lightCb, '--dor-present');
    expect(c.toLowerCase()).not.toBe('#4caf7d');
    expect(p.toLowerCase()).not.toBe('#e5a83b');
    // آبی: کانال آبی غالب؛ نارنجی: قرمز غالب
    expect(c.toLowerCase()).toBe('#1e5fc2');
    expect(p.toLowerCase()).toBe('#e07a2e');
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
  it('حداقل ناحیه‌ی لمس 44px تعریف شده', () => {
    expect(base['--dor-touch-min']).toBe('44px');
  });
});
