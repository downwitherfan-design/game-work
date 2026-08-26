/**
 * جدول «سلامت کلمه» — حلقه‌ی بازخورد داده‌محور به AI-02 (Deming/PDCA).
 *
 * از رویدادهای puzzle_finished روزانه، برای هر puzzleNumber میانگین حدس و
 * نرخ باخت تجمیع می‌شود. کلمه‌های خیلی سخت (mianginHigh یا lossRate بالا)
 * = ریسک churn روزانه → گزارش هفتگی md برای بازبینی دیتابیس کلمات.
 *
 * ورودی این ماژول رکوردهای سیمی (WireEvent) هستند — یعنی همان چیزی که
 * endpoint دریافت می‌کند یا در صف است؛ بنابراین هم سمت سرور و هم در ابزار
 * تحلیل آفلاین قابل استفاده است. صفر وابستگی.
 */

import type { WireEvent } from './types';

export interface WordHealthRow {
  puzzleNumber: number;
  plays: number;
  wins: number;
  losses: number;
  lossRate: number; // 0..1
  avgGuessCount: number; // فقط بردها (بازنده همیشه 6 مصرف می‌کند)
  avgDurationMs: number;
  /** پرچم سلامت: 'ok' | 'hard' | 'very_hard' */
  flag: 'ok' | 'hard' | 'very_hard';
}

/** آستانه‌های پرچم سختی (قابل تیون با remote config در آینده). */
export const HARD_LOSS_RATE = 0.25; // باخت > ۲۵٪ = سخت
export const VERY_HARD_LOSS_RATE = 0.4; // باخت > ۴۰٪ = خیلی سخت → churn
export const HARD_AVG_GUESS = 5.0;

/** استخراج puzzleNumber از puzzleId قراردادی 'daily-<n>' — تمرینی‌ها null. */
export function puzzleNumberFromId(puzzleId: string): number | null {
  const m = /^daily-(\d+)$/.exec(puzzleId);
  if (!m) return null;
  return Number(m[1]);
}

interface FinishPayload {
  puzzleId?: unknown;
  won?: unknown;
  guessCount?: unknown;
  durationMs?: unknown;
}

/** تجمیع رکوردهای puzzle_finished به جدول سلامت کلمه. */
export function aggregateWordHealth(events: readonly WireEvent[]): WordHealthRow[] {
  const acc = new Map<
    number,
    { plays: number; wins: number; sumWinGuess: number; sumDuration: number }
  >();

  for (const e of events) {
    if (e.event !== 'puzzle_finished') continue;
    const p = e.payload as FinishPayload;
    if (typeof p.puzzleId !== 'string') continue;
    const n = puzzleNumberFromId(p.puzzleId);
    if (n === null) continue;
    const won = p.won === true;
    const guessCount = typeof p.guessCount === 'number' ? p.guessCount : 0;
    const durationMs = typeof p.durationMs === 'number' ? p.durationMs : 0;

    let row = acc.get(n);
    if (!row) {
      row = { plays: 0, wins: 0, sumWinGuess: 0, sumDuration: 0 };
      acc.set(n, row);
    }
    row.plays += 1;
    if (won) {
      row.wins += 1;
      row.sumWinGuess += guessCount;
    }
    row.sumDuration += durationMs;
  }

  const out: WordHealthRow[] = [];
  for (const [puzzleNumber, r] of acc) {
    const losses = r.plays - r.wins;
    const lossRate = r.plays > 0 ? losses / r.plays : 0;
    const avgGuessCount = r.wins > 0 ? r.sumWinGuess / r.wins : 0;
    const flag: WordHealthRow['flag'] =
      lossRate > VERY_HARD_LOSS_RATE
        ? 'very_hard'
        : lossRate > HARD_LOSS_RATE || avgGuessCount > HARD_AVG_GUESS
          ? 'hard'
          : 'ok';
    out.push({
      puzzleNumber,
      plays: r.plays,
      wins: r.wins,
      losses,
      lossRate: round2(lossRate),
      avgGuessCount: round2(avgGuessCount),
      avgDurationMs: Math.round(r.plays > 0 ? r.sumDuration / r.plays : 0),
      flag,
    });
  }
  out.sort((a, b) => a.puzzleNumber - b.puzzleNumber);
  return out;
}

/** رندر گزارش هفتگی Markdown برای AI-02 — خروجی متنی، بدون I/O. */
export function renderWordHealthReport(rows: readonly WordHealthRow[], weekLabel: string): string {
  const lines: string[] = [
    `# 📊 گزارش هفتگی سلامت کلمه — ${weekLabel}`,
    '',
    'حلقه‌ی بازخورد داده‌محور به AI-02 (word-db). کلمه‌های `very_hard` = ریسک churn روزانه.',
    '',
    '| puzzleNumber | بازی | برد | باخت | نرخ باخت | میانگین حدس (بردها) | میانگین زمان (ms) | پرچم |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const flag = r.flag === 'very_hard' ? '🔴 very_hard' : r.flag === 'hard' ? '🟡 hard' : '🟢 ok';
    lines.push(
      `| ${r.puzzleNumber} | ${r.plays} | ${r.wins} | ${r.losses} | ${(r.lossRate * 100).toFixed(0)}٪ | ${r.avgGuessCount} | ${r.avgDurationMs} | ${flag} |`,
    );
  }
  const hardOnes = rows.filter((r) => r.flag !== 'ok');
  lines.push('');
  lines.push(
    hardOnes.length === 0
      ? '✅ همه‌ی کلمات این هفته در محدوده‌ی سالم بودند.'
      : `⚠️ ${hardOnes.length} کلمه نیاز به بازبینی دارند: ${hardOnes.map((r) => `#${r.puzzleNumber}`).join('، ')}`,
  );
  lines.push('');
  return lines.join('\n');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
