/**
 * @dordaneh/contracts — core types + canonical Persian text utilities.
 * Source of truth: docs/02_CONTRACTS.md §1. Locked after initial implementation (RFC only).
 */

/** نویسه‌های مجاز فارسی پس از نرمال‌سازی */
export type PersianChar = string; // یک code point از الفبای فارسی نرمال

export type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export interface GuessEvaluation {
  guess: string; // نرمال‌شده
  states: LetterState[]; // هم‌طول با guess
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface PuzzleState {
  puzzleId: string; // 'daily-812' یا 'practice-<seed>'
  solution?: string; // فقط پس از پایان بازی پر می‌شود
  wordLength: number; // MVP روزانه: 6
  maxGuesses: number; // 6
  guesses: GuessEvaluation[];
  status: GameStatus;
  hintsUsed: number;
  startedAt: number;
  finishedAt?: number; // epoch ms
}

export interface EngineApi {
  /** معمای روزانه‌ی قطعی — آفلاین، از seed محلی */
  getDailyPuzzle(puzzleNumber: number): { puzzleId: string; wordLength: number };
  /** معمای تمرینی با دشواری پویا (1..5) */
  getPracticePuzzle(difficulty: number, seed?: number): { puzzleId: string; wordLength: number };
  evaluateGuess(
    puzzleId: string,
    guess: string,
  ): GuessEvaluation | { error: 'INVALID_WORD' | 'WRONG_LENGTH' };
  getState(puzzleId: string): PuzzleState;
  getHint(puzzleId: string): { letter: PersianChar; position: number } | null;
  /** پیروزی ۳۰ثانیه‌ای: معمای آسان دست‌چین آنبوردینگ */
  getOnboardingPuzzle(): { puzzleId: string; wordLength: number };
}

// ---------------------------------------------------------------------------
// Canonical Persian normalization — the ONLY allowed implementation project-wide
// (docs/01_RED_LINES.md #21). Rules from docs/00_MASTER_PLAN.md §3:
//   ي→ی، ك→ک، ۀ→ه، حذف اعراب (tashkeel)، حذف ZWNJ در مقایسه، حفظ آ.
// ---------------------------------------------------------------------------

const ZWNJ = '\u200C';
const ZWJ = '\u200D';

/** Arabic diacritics / tashkeel range + superscript alef + tatweel */
const DIACRITICS_RE = /[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;

const CHAR_MAP: Readonly<Record<string, string>> = {
  '\u064A': '\u06CC', // ي → ی
  '\u0649': '\u06CC', // ى (alef maqsura) → ی
  '\u06CD': '\u06CC', // ۍ → ی
  '\u06D2': '\u06CC', // ے → ی
  '\u0643': '\u06A9', // ك → ک
  '\u06AA': '\u06A9', // ڪ → ک
  '\u06C0': '\u0647', // ۀ → ه
  '\u0629': '\u0647', // ة → ه
  '\u0623': '\u0627', // أ → ا
  '\u0625': '\u0627', // إ → ا
  '\u0624': '\u0648', // ؤ → و
};

/** نرمال‌سازی متن فارسی — تنها پیاده‌سازی مجاز در کل پروژه */
export function normalizeFa(input: string): string {
  let out = input.normalize('NFC');
  out = out.replace(DIACRITICS_RE, '');
  out = out.split('').map((ch) => CHAR_MAP[ch] ?? ch).join('');
  out = out.split(ZWNJ).join('').split(ZWJ).join('');
  out = out.trim();
  return out;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** تبدیل ارقام لاتین به فارسی برای نمایش */
export function toPersianDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] as string);
}

// ---------------------------------------------------------------------------
// Puzzle number — days elapsed since 2026-09-01 in Asia/Tehran (day one = 1).
// docs/02_CONTRACTS.md §0. Deterministic; never compute this yourself elsewhere.
// ---------------------------------------------------------------------------

export const PUZZLE_EPOCH = '2026-09-01';
export const PUZZLE_TIMEZONE = 'Asia/Tehran';

const dtf = new Intl.DateTimeFormat('en-CA', {
  timeZone: PUZZLE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** تاریخ محلی تهران به شکل YYYY-MM-DD برای یک لحظه‌ی مشخص */
export function tehranDateString(at: Date): string {
  return dtf.format(at); // en-CA → YYYY-MM-DD
}

const MS_PER_DAY = 86_400_000;

function utcMidnight(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/**
 * شماره‌ی معما برای یک لحظه‌ی دلخواه (برای تست‌پذیری).
 * روز 2026-09-01 تهران = معمای شماره‌ی 1.
 */
export function puzzleNumberForDate(at: Date): number {
  const today = tehranDateString(at);
  const diffDays = Math.round((utcMidnight(today) - utcMidnight(PUZZLE_EPOCH)) / MS_PER_DAY);
  return diffDays + 1;
}

/** شماره‌ی معمای امروز (Asia/Tehran) */
export function puzzleNumberForNow(): number {
  return puzzleNumberForDate(new Date());
}
