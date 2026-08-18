import { describe, expect, it } from 'vitest';
import { normalizeFa } from '@dordaneh/contracts';
import {
  buildResultGridText,
  DEFAULT_THEME,
  jalaliMonthDay,
  OCCASION_THEMES,
  puzzleNumberFromId,
  RLM,
  themeForDate,
  type GridBuildContext,
} from '../src/grid';
import { lostState, wonState } from './helpers';

function ctx(overrides: Partial<GridBuildContext> = {}): GridBuildContext {
  return {
    theme: DEFAULT_THEME,
    streak: 12,
    appName: 'دُردانه',
    gem: '💎',
    lostMark: '✖',
    streakTemplate: (c) => `🔥 استریک: ${c}`,
    domain: 'dordaneh.app',
    ...overrides,
  };
}

describe('buildResultGridText', () => {
  it('گرید کامل نمونه‌ی پرامپت را می‌سازد (برد ۴/۶، استریک ۱۲)', () => {
    const out = buildResultGridText(wonState(), ctx());
    const lines = out.split('\n');
    expect(lines[0]).toBe(`${RLM}دُردانه 💎 #۸۱۲ — ۴/۶`);
    expect(lines[1]).toBe(`${RLM}⬜🟨⬜⬜⬜🟩`);
    expect(lines[2]).toBe(`${RLM}🟨🟩⬜⬜🟩🟩`);
    expect(lines[3]).toBe(`${RLM}🟩🟩🟨⬜🟩🟩`);
    expect(lines[4]).toBe(`${RLM}🟩🟩🟩🟩🟩🟩`);
    expect(lines[5]).toBe(`${RLM}🔥 استریک: ۱۲`);
    expect(lines[6]).toBe('dordaneh.app');
    expect(lines).toHaveLength(7);
  });

  it('باخت را با ✖/۶ نشان می‌دهد', () => {
    const out = buildResultGridText(lostState(), ctx());
    expect(out.split('\n')[0]).toContain('✖/۶');
  });

  it('اعداد همیشه فارسی‌اند (هیچ رقم لاتین در خروجی نیست)', () => {
    const out = buildResultGridText(wonState(), ctx());
    expect(out).not.toMatch(/[0-9]/);
  });

  it('هر خط گرید و هدر با RLM شروع می‌شود (RTL سالم در تلگرام/واتساپ)', () => {
    const out = buildResultGridText(wonState(), ctx());
    const lines = out.split('\n');
    // همه به‌جز خط آخر (دامنه — لاتین/LTR)
    for (const line of lines.slice(0, -1)) {
      expect(line.startsWith(RLM)).toBe(true);
    }
  });

  it('🛡️ ضداسپویل: هرگز جواب یا حروف حدس‌ها در خروجی نیست', () => {
    const state = wonState({ solution: 'دلاور' });
    const out = buildResultGridText(state, ctx());
    expect(out).not.toContain('دلاور');
    expect(out).not.toContain(normalizeFa('دلاور'));
    for (const g of state.guesses) {
      expect(out).not.toContain(g.guess);
    }
    // خروجی فقط از نویسه‌های مجاز (هدر/ایموجی/استریک/دامنه) ساخته شده
    const gridLines = out.split('\n').slice(1, 1 + state.guesses.length);
    for (const line of gridLines) {
      expect(line.replace(RLM, '')).toMatch(/^[🟩🟨⬜]+$/u);
    }
  });

  it('استریک صفر/null → خط استریک حذف می‌شود', () => {
    expect(buildResultGridText(wonState(), ctx({ streak: 0 }))).not.toContain('استریک');
    expect(buildResultGridText(wonState(), ctx({ streak: null }))).not.toContain('استریک');
  });

  it('معمای تمرینی (بدون شماره) → بدون «#»', () => {
    const out = buildResultGridText(wonState({ puzzleId: 'practice-99' }), ctx());
    expect(out.split('\n')[0]).not.toContain('#');
  });

  it('حالت‌های empty/tbd به‌عنوان absent رندر می‌شوند (بدون نشت اطلاعات)', () => {
    const st = wonState({
      guesses: [{ guess: 'x', states: ['empty', 'tbd', 'absent', 'correct', 'present', 'absent'] }],
    });
    const out = buildResultGridText(st, ctx());
    expect(out.split('\n')[1]).toBe(`${RLM}⬜⬜⬜🟩🟨⬜`);
  });

  it('قالب مناسبتی جایگزین ایموجی‌ها می‌شود (نوروز: 🟩→🌱)', () => {
    const nowruz = OCCASION_THEMES[0]!.theme;
    const out = buildResultGridText(wonState(), ctx({ theme: nowruz }));
    expect(out).toContain('🌱');
    expect(out).not.toContain('🟩');
  });
});

describe('puzzleNumberFromId', () => {
  it('daily-812 → 812', () => {
    expect(puzzleNumberFromId('daily-812')).toBe(812);
  });
  it('practice-x → null', () => {
    expect(puzzleNumberFromId('practice-42')).toBeNull();
    expect(puzzleNumberFromId('duel-abc')).toBeNull();
  });
});

describe('themeForDate — قالب مناسبتی از تقویم شمسی', () => {
  it('روز عادی → قالب پیش‌فرض', () => {
    // 2026-08-18 میلادی ≈ ۲۷ مرداد — روز عادی
    expect(themeForDate(new Date('2026-08-18T12:00:00Z')).name).toBe('default');
  });
  it('نوروز (۱ فروردین) → قالب nowruz', () => {
    // نوروز ۱۴۰۵ ≈ 2026-03-21
    expect(themeForDate(new Date('2026-03-21T12:00:00Z')).name).toBe('nowruz');
  });
  it('یلدا (۳۰ آذر) → قالب yalda', () => {
    // ۳۰ آذر ۱۴۰۵ ≈ 2026-12-21
    expect(themeForDate(new Date('2026-12-21T12:00:00Z')).name).toBe('yalda');
  });
  it('jalaliMonthDay قالب MM-DD برمی‌گرداند', () => {
    expect(jalaliMonthDay(new Date('2026-03-21T12:00:00Z'))).toBe('01-01');
  });
});
