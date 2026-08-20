/**
 * @dordaneh/duel-mode — تایپ‌های داخلی و نمای (view-model) دوئل.
 * مالک: AI-10. قرارداد REST: docs/02_CONTRACTS.md §7 (سرور: AI-09، ما کلاینت).
 */

import type {
  ApiResponse,
  DuelCreateData,
  DuelPlayer,
  DuelResultData,
  DuelStateData,
  PuzzleState,
} from '@dordaneh/contracts';

// ---------------------------------------------------------------------------
// نتیجه‌ی محلی یک طرف دوئل
// ---------------------------------------------------------------------------

/**
 * قرارداد §7 برای DuelResultBody فیلد `won` ندارد؛ تا تأیید RFC-0002 از
 * کانونشن آداپتوری استفاده می‌کنیم: `guessCount === DUEL_DNF` یعنی «حل نشد».
 * (docs/rfcs/RFC-0002-duel-contract-gaps-and-preact-dep.md)
 */
export const DUEL_DNF = 0;

export interface DuelOutcomeInput {
  /** تعداد حدس تا حل؛ یا DUEL_DNF اگر نبرد */
  guessCount: number;
  /** زمان صرف‌شده به میلی‌ثانیه */
  durationMs: number;
}

export type DuelVerdict = 'win' | 'loss' | 'draw';

// ---------------------------------------------------------------------------
// فازهای ماشین حالت DuelScreen
// ---------------------------------------------------------------------------

export type DuelPhase =
  /** فلگ خاموش است (پیش‌فرض تا فاز ۲) */
  | 'disabled'
  /** صفحه‌ی ورودی: ساخت دوئل جدید یا دوئل روزانه */
  | 'landing'
  /** درخواست POST /duel در جریان است */
  | 'creating'
  /** دوئل ساخته شد — سازنده باید اول خودش حل کند */
  | 'solving'
  /** مهمان از لینک آمده — قبل از دیدن هر چیزی باید قبول کند (ضد اسپویل) */
  | 'invited'
  /** نتیجه‌ی خودم ثبت شد؛ منتظر حریف — polling هر ۳۰ ثانیه */
  | 'waiting'
  /** هر دو طرف بازی کرده‌اند — نمایش برنده */
  | 'finished'
  /** دوئل ۷۲ ساعته منقضی شده */
  | 'expired'
  /** خطای شبکه/سرور — با دکمه‌ی تلاش دوباره */
  | 'error';

export interface DuelViewState {
  phase: DuelPhase;
  duelId: string | null;
  /** seed معمای مشترک — به GameScreen (از طریق slot) پاس می‌شود */
  seed: number | null;
  inviteUrl: string | null;
  /** نام سازنده برای پیام خوش‌آمد مهمان (بدون هیچ آمار اسپویل‌کننده) */
  hostName: string | null;
  /** نتیجه‌ی خودم (پس از حل) */
  selfResult: DuelOutcomeInput | null;
  /** نتیجه‌ی حریف — فقط وقتی خودم تمام کرده باشم پر می‌شود (ضد اسپویل) */
  opponent: DuelPlayer | null;
  verdict: DuelVerdict | null;
  /** پیام خطای قابل‌نمایش (کلید locale) */
  errorKey: string | null;
}

// ---------------------------------------------------------------------------
// کلاینت REST — دقیقاً قرارداد §7
// ---------------------------------------------------------------------------

export interface DuelApi {
  createDuel(anonId: string, name: string): Promise<ApiResponse<DuelCreateData>>;
  submitResult(
    duelId: string,
    anonId: string,
    guessCount: number,
    durationMs: number,
  ): Promise<ApiResponse<DuelResultData>>;
  getDuel(duelId: string): Promise<ApiResponse<DuelStateData>>;
}

// ---------------------------------------------------------------------------
// سری دوئل (برد-باخت تجمعی با یک حریف) — ذخیره‌ی محلی
// ---------------------------------------------------------------------------

export interface DuelSeriesRecord {
  opponentName: string;
  wins: number;
  losses: number;
  draws: number;
  lastDuelAt: number; // epoch ms
}

export type DuelSeriesMap = Record<string, DuelSeriesRecord>;

// ---------------------------------------------------------------------------
// اسلات صفحه‌ی بازی — app-shell این را با GameScreen (AI-06) پر می‌کند؛
// duel-mode طبق نمودار وابستگی حق import از game-board را ندارد.
// ---------------------------------------------------------------------------

export interface DuelBoardSlotProps {
  mode: 'duel';
  seed: number;
  puzzleId: string;
  onFinished: (state: PuzzleState) => void;
}
