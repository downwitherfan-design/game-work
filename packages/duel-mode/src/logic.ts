/**
 * @dordaneh/duel-mode — منطق خالص دوئل (بدون DOM/شبکه — تست‌پذیر ۱۰۰٪).
 * قواعد برد: «حدس کمتر، سپس زمان کمتر». انقضا: ۷۲ ساعت.
 */

import { toPersianDigits } from '@dordaneh/contracts';
import type { PuzzleState } from '@dordaneh/contracts';
import { DUEL_DNF, type DuelOutcomeInput, type DuelVerdict } from './types';

/** طول عمر دوئل: ۷۲ ساعت (میلی‌ثانیه) */
export const DUEL_TTL_MS = 72 * 60 * 60 * 1000;

/** بازه‌ی polling صفحه‌ی انتظار: ۳۰ ثانیه */
export const DUEL_POLL_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// برنده
// ---------------------------------------------------------------------------

/**
 * معیار قطعی برد: حدسِ کمتر می‌برد؛ اگر برابر بود زمانِ کمتر می‌برد؛
 * اگر هر دو برابر بود مساوی. «حل‌نکرده» (DUEL_DNF) همیشه از حل‌کرده می‌بازد؛
 * دو حل‌نکرده مساوی‌اند.
 */
export function decideVerdict(self: DuelOutcomeInput, opponent: DuelOutcomeInput): DuelVerdict {
  const selfSolved = self.guessCount !== DUEL_DNF;
  const oppSolved = opponent.guessCount !== DUEL_DNF;

  if (!selfSolved && !oppSolved) return 'draw';
  if (!selfSolved) return 'loss';
  if (!oppSolved) return 'win';

  if (self.guessCount < opponent.guessCount) return 'win';
  if (self.guessCount > opponent.guessCount) return 'loss';
  if (self.durationMs < opponent.durationMs) return 'win';
  if (self.durationMs > opponent.durationMs) return 'loss';
  return 'draw';
}

// ---------------------------------------------------------------------------
// انقضا (۷۲ ساعت)
// ---------------------------------------------------------------------------

/** آیا دوئل ساخته‌شده در createdAt در لحظه‌ی now منقضی شده؟ */
export function isDuelExpired(createdAtMs: number, nowMs: number): boolean {
  return nowMs - createdAtMs >= DUEL_TTL_MS;
}

// ---------------------------------------------------------------------------
// استخراج نتیجه‌ی محلی از PuzzleState (خروجی GameScreen)
// ---------------------------------------------------------------------------

/** تبدیل وضعیت پایان بازی به ورودی نتیجه‌ی دوئل (کانونشن DNF طبق RFC-0002) */
export function outcomeFromPuzzleState(state: PuzzleState): DuelOutcomeInput {
  const durationMs = Math.max(0, (state.finishedAt ?? state.startedAt) - state.startedAt);
  if (state.status === 'won') {
    return { guessCount: Math.max(1, state.guesses.length), durationMs };
  }
  return { guessCount: DUEL_DNF, durationMs };
}

// ---------------------------------------------------------------------------
// ضد اسپویل — دروازه‌ی دیدن اطلاعات حریف
// ---------------------------------------------------------------------------

/**
 * B قبل از پایان بازیِ خودش هیچ اطلاعی از عملکرد A نمی‌بیند
 * (بستن curiosity gap — Loewenstein 1994). این تابع تنها دروازه‌ی مجاز است.
 */
export function canRevealOpponent(selfResult: DuelOutcomeInput | null): boolean {
  return selfResult !== null;
}

// ---------------------------------------------------------------------------
// گرید مقایسه‌ای بی‌اسپویلر (دو ستون ایموجی کنار هم)
// ---------------------------------------------------------------------------

const EMOJI: Record<string, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
};

function gridLines(state: PuzzleState): string[] {
  return state.guesses.map((g) =>
    // نمایش RTL: ترتیب خانه‌ها معکوس تا با جهت خواندن فارسی هم‌راستا شود
    [...g.states]
      .reverse()
      .map((s) => EMOJI[s] ?? '⬜')
      .join(''),
  );
}

/**
 * گرید مقایسه‌ای پس از پایان هر دو طرف: دو گرید ایموجی کنار هم — بی‌اسپویلر
 * (نه حروف، نه کلمه) و قابل اشتراک (Berger 2013، Public).
 * فقط با گرید خودم هم کار می‌کند (حریف هنوز نیامده → یک ستونه).
 */
export function buildDuelComparisonGrid(
  selfState: PuzzleState,
  selfLabel: string,
  opponentSummary?: { name: string; guessCount: number },
): string {
  const mine = gridLines(selfState);
  const header = `⚔️ دوئل دُردانه`;
  const lines: string[] = [header, ''];
  const selfScore =
    selfState.status === 'won' ? `${toPersianDigits(mine.length)}/۶` : 'X/۶';
  lines.push(`${selfLabel}: ${selfScore}`);
  lines.push(...mine);
  if (opponentSummary) {
    const oppScore =
      opponentSummary.guessCount === DUEL_DNF
        ? 'X/۶'
        : `${toPersianDigits(opponentSummary.guessCount)}/۶`;
    lines.push('', `${opponentSummary.name}: ${oppScore}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// شناسه‌ی ناشناس محلی (بدون ثبت‌نام — خط قرمز ۱۴)
// ---------------------------------------------------------------------------

/** UUIDv4 با Web Crypto در دسترس، وگرنه فالبک قطعی-تصادفی ساده */
export function generateAnonId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // فالبک برای WebViewهای قدیمی
  let out = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else out += hex[Math.floor(Math.random() * 16)] as string;
  }
  return out;
}

/** نام پیش‌فرض قراردادی: «مسافر + عدد» */
export function defaultPlayerName(seedNum?: number): string {
  const n = seedNum ?? Math.floor(Math.random() * 9000) + 1000;
  return `مسافر ${toPersianDigits(n)}`;
}

// ---------------------------------------------------------------------------
// استخراج duelId از مسیر /duel/:id
// ---------------------------------------------------------------------------

/** پارس مسیر route — null یعنی صفحه‌ی landing (بدون id) */
export function parseDuelPath(path: string): string | null {
  const m = /^\/duel\/([A-Za-z0-9_-]+)\/?$/.exec(path);
  return m ? (m[1] as string) : null;
}
