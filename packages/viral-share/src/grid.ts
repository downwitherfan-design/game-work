/**
 * گرید ایموجی بی‌اسپویلر — قلب موتور وایرال دُردانه.
 *
 * مبنای علمی: ارز اجتماعی + Public در مدل STEPPS (Berger, Contagious, 2013).
 * گرید هم «نمایش هوش من» است هم تبلیغ قابل‌مشاهده‌ی محصول — بدون هیچ اسپویلی
 * (نه جواب، نه حروف)؛ فقط الگوی رنگ‌ها = دعوت به بازی.
 *
 * RTL: خطوط ایموجی از نویسه‌های bidi-خنثی تشکیل می‌شوند؛ برای نمایش پایدار
 * در تلگرام/واتساپ/اینستاگرام (که کانتکست پیام ممکن است LTR باشد) ابتدای هر
 * خط RLM (U+200F) می‌گذاریم تا حرف اولِ کلمه همیشه سمت راست دیده شود.
 */

import { toPersianDigits, type LetterState, type PuzzleState } from '@dordaneh/contracts';
import type { GridTheme } from './types';

/** نویسه‌ی کنترل جهت راست‌به‌چپ (Right-to-Left Mark) */
export const RLM = '\u200F';

/** قالب پیش‌فرض گرید */
export const DEFAULT_THEME: GridTheme = {
  name: 'default',
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
};

/**
 * قالب‌های مناسبتی — تازگی دوره‌ای برای جلوگیری از کوری بنر
 * (Berlyne 1960, novelty). تاریخ‌ها شمسی 'MM-DD'.
 */
export const OCCASION_THEMES: ReadonlyArray<{ from: string; to: string; theme: GridTheme }> = [
  // نوروز: ۱ تا ۱۳ فروردین — جوانه به‌جای سبز
  { from: '01-01', to: '01-13', theme: { name: 'nowruz', correct: '🌱', present: '🟨', absent: '⬜' } },
  // شب یلدا: ۳۰ آذر — انار و ستاره
  { from: '09-30', to: '09-30', theme: { name: 'yalda', correct: '🍎', present: '⭐', absent: '⬛' } },
];

const jalaliFmt = new Intl.DateTimeFormat('en-CA-u-ca-persian-nu-latn', {
  timeZone: 'Asia/Tehran',
  month: '2-digit',
  day: '2-digit',
});

/** 'MM-DD' شمسی برای یک لحظه (تهران) */
export function jalaliMonthDay(at: Date): string {
  const parts = jalaliFmt.formatToParts(at);
  const mm = parts.find((p) => p.type === 'month')?.value ?? '01';
  const dd = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${mm}-${dd}`;
}

/** انتخاب قالب گرید بر اساس تقویم شمسی */
export function themeForDate(at: Date): GridTheme {
  const md = jalaliMonthDay(at);
  for (const o of OCCASION_THEMES) {
    if (md >= o.from && md <= o.to) return o.theme;
  }
  return DEFAULT_THEME;
}

function emojiFor(state: LetterState, theme: GridTheme): string {
  switch (state) {
    case 'correct':
      return theme.correct;
    case 'present':
      return theme.present;
    default:
      // absent / empty / tbd — هرگز اطلاعات اضافه لو نمی‌دهیم
      return theme.absent;
  }
}

/** شماره‌ی معما از puzzleId ('daily-812' → 812)؛ برای practice: null */
export function puzzleNumberFromId(puzzleId: string): number | null {
  const m = /^daily-(\d+)$/.exec(puzzleId);
  return m ? Number(m[1]) : null;
}

export interface GridBuildContext {
  theme: GridTheme;
  streak: number | null;
  appName: string;
  gem: string;
  lostMark: string;
  streakTemplate: (count: string) => string;
  domain: string;
}

/**
 * ساخت گرید بی‌اسپویلر.
 *
 * خروجی نمونه:
 *   دُردانه 💎 #۸۱۲ — ۴/۶
 *   ⬜🟨⬜⬜⬜🟩
 *   🟩🟩🟩🟩🟩🟩
 *   🔥 استریک: ۱۲
 *   dordaneh.app
 *
 * تضمین بی‌اسپویلری: فقط از states استفاده می‌شود؛ هیچ ارجاعی به
 * guess/solution وجود ندارد (تست ضداسپویل در test/grid.test.ts).
 */
export function buildResultGridText(state: PuzzleState, ctx: GridBuildContext): string {
  const n = puzzleNumberFromId(state.puzzleId);
  const numberPart = n === null ? '' : ` #${toPersianDigits(n)}`;
  const score =
    state.status === 'won' ? toPersianDigits(state.guesses.length) : ctx.lostMark;
  const header = `${RLM}${ctx.appName} ${ctx.gem}${numberPart} — ${score}/${toPersianDigits(state.maxGuesses)}`;

  const rows = state.guesses.map(
    (g) => RLM + g.states.map((s) => emojiFor(s, ctx.theme)).join(''),
  );

  const lines = [header, ...rows];
  if (ctx.streak !== null && ctx.streak > 0) {
    lines.push(RLM + ctx.streakTemplate(toPersianDigits(ctx.streak)));
  }
  lines.push(ctx.domain);
  return lines.join('\n');
}
