/**
 * آمار بازی — dor.stats: بازی‌ها، درصد برد، هیستوگرام حدس‌ها، تقویم،
 * الگوی ساعت بازی (برای پیشنهاد ساعت نوتیف).
 */
import type { DailyResult, StatsState } from './types';

/** حداکثر ساعت‌های ذخیره‌شده برای الگوی بازی */
const MAX_PLAY_HOURS = 20;
/** حداکثر شماره‌ی معماهای ذخیره‌شده برای تقویم (~۱۳ ماه) */
const MAX_PLAYED_PUZZLES = 400;

export function createInitialStats(): StatsState {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    guessDist: [0, 0, 0, 0, 0, 0],
    playedPuzzles: [],
    lastResult: null,
    playHours: [],
    winsInRow: 0,
    achievements: {},
    notif: { enabled: false, asked: false, hour: null, lastScheduledFor: null },
    reviewsDone: 0,
    dordanehDaysWon: 0,
  };
}

/** بازخوانی ایمن از storage (fail-soft) */
export function sanitizeStats(raw: unknown): StatsState {
  const init = createInitialStats();
  if (typeof raw !== 'object' || raw === null) return init;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fb: number): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fb;
  const dist = Array.isArray(r['guessDist']) ? (r['guessDist'] as unknown[]) : [];
  const guessDist = init.guessDist.map((_, i) => num(dist[i], 0)) as StatsState['guessDist'];
  const notifRaw = (
    typeof r['notif'] === 'object' && r['notif'] !== null ? r['notif'] : {}
  ) as Record<string, unknown>;
  return {
    gamesPlayed: num(r['gamesPlayed'], 0),
    gamesWon: num(r['gamesWon'], 0),
    guessDist,
    playedPuzzles: Array.isArray(r['playedPuzzles'])
      ? (r['playedPuzzles'] as unknown[]).filter((n): n is number => typeof n === 'number')
      : [],
    lastResult:
      typeof r['lastResult'] === 'object' && r['lastResult'] !== null
        ? (r['lastResult'] as DailyResult)
        : null,
    playHours: Array.isArray(r['playHours'])
      ? (r['playHours'] as unknown[]).filter(
          (n): n is number => typeof n === 'number' && n >= 0 && n <= 23,
        )
      : [],
    winsInRow: num(r['winsInRow'], 0),
    achievements:
      typeof r['achievements'] === 'object' && r['achievements'] !== null
        ? (r['achievements'] as Record<string, number>)
        : {},
    notif: {
      enabled: notifRaw['enabled'] === true,
      asked: notifRaw['asked'] === true,
      hour:
        typeof notifRaw['hour'] === 'number' && notifRaw['hour'] >= 0 && notifRaw['hour'] <= 23
          ? Math.floor(notifRaw['hour'] as number)
          : null,
      lastScheduledFor:
        typeof notifRaw['lastScheduledFor'] === 'number'
          ? Math.floor(notifRaw['lastScheduledFor'] as number)
          : null,
    },
    reviewsDone: num(r['reviewsDone'], 0),
    dordanehDaysWon: num(r['dordanehDaysWon'], 0),
  };
}

/** ثبت نتیجه‌ی یک بازی روزانه (idempotent نسبت به puzzleNumber) */
export function recordResult(
  state: StatsState,
  result: DailyResult,
  tehranHour: number,
): StatsState {
  // بازی دوباره‌ی همان معما را دوباره نشمار
  if (state.playedPuzzles.includes(result.puzzleNumber)) return state;

  const s: StatsState = {
    ...state,
    guessDist: [...state.guessDist] as StatsState['guessDist'],
    playedPuzzles: [...state.playedPuzzles],
    playHours: [...state.playHours],
    achievements: { ...state.achievements },
    notif: { ...state.notif },
  };

  s.gamesPlayed += 1;
  if (result.won) {
    s.gamesWon += 1;
    s.winsInRow += 1;
    const idx = Math.min(Math.max(result.guessCount, 1), 6) - 1;
    s.guessDist[idx] = (s.guessDist[idx] ?? 0) + 1;
  } else {
    s.winsInRow = 0;
  }

  s.playedPuzzles.push(result.puzzleNumber);
  if (s.playedPuzzles.length > MAX_PLAYED_PUZZLES)
    s.playedPuzzles = s.playedPuzzles.slice(-MAX_PLAYED_PUZZLES);

  s.playHours.push(tehranHour);
  if (s.playHours.length > MAX_PLAY_HOURS) s.playHours = s.playHours.slice(-MAX_PLAY_HOURS);

  s.lastResult = result;
  return s;
}

/** درصد برد (۰..۱۰۰، گرد شده) */
export function winRate(state: StatsState): number {
  if (state.gamesPlayed === 0) return 0;
  return Math.round((state.gamesWon / state.gamesPlayed) * 100);
}

/**
 * ساعت پیشنهادی نوتیف = میانه‌ی ساعت‌های بازی کاربر — trigger شخصی‌سازی‌شده
 * (Eyal, Hooked, 2014). فالبک: ۱۹ (عصر — الگوی رایج بازی‌های روزانه).
 */
export const DEFAULT_REMINDER_HOUR = 19;

export function suggestedReminderHour(state: StatsState): number {
  if (state.playHours.length === 0) return DEFAULT_REMINDER_HOUR;
  const sorted = [...state.playHours].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[mid] as number)
      : Math.round(((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
  return Math.min(23, Math.max(0, median));
}

/**
 * لحظه‌ی درستِ درخواست اجازه‌ی نوتیف: بعد از ۳ روز بازی متوالی و فقط یک‌بار.
 * (درخواست در لحظه‌ی ارزش = نرخ پذیرش بالاتر.)
 */
export const NOTIF_ASK_STREAK = 3;

export function shouldAskNotifPermission(state: StatsState, currentStreak: number): boolean {
  return !state.notif.asked && !state.notif.enabled && currentStreak >= NOTIF_ASK_STREAK;
}
