/**
 * آلبوم «گنجینه» — dor.album:
 *  - کشف کارت پس از حل معما؛ کارت‌های کشف‌نشده سیلوئت با «؟»
 *    (اثر زایگارنیک ۱۹۲۷: کار ناتمام در ذهن می‌ماند → بازگشت).
 *  - پیشرفت اعطاشده (Nunes & Drèze, JCR 2006): چند کارت اول را زود بده —
 *    سفرِ شروع‌شده رها نمی‌شود.
 *  - مرور فاصله‌دار (Ebbinghaus 1885؛ Cepeda et al. 2006): فواصل ۱،۳،۷،۱۴ روز —
 *    بازی واقعاً آموزنده می‌شود = ارزش کاربردی برای اشتراک (Berger 2013).
 */
import type { AlbumState, ReviewState } from './types';

/** فواصل مرور (روز) — پس از آخرین مرحله، هر ۱۴ روز تکرار می‌شود */
export const REVIEW_INTERVALS = [1, 3, 7, 14] as const;
/** تعداد کارت‌های هدیه‌ی «پیشرفت اعطاشده» در اولین بازدید */
export const ENDOWED_CARDS = 3;
/** حداکثر کارت پیشنهادی «مرور امروز» */
export const REVIEW_BATCH = 3;

export function createInitialAlbum(): AlbumState {
  return { discovered: {}, endowedGranted: false, review: {} };
}

/** بازخوانی ایمن از storage (fail-soft) */
export function sanitizeAlbum(raw: unknown): AlbumState {
  const init = createInitialAlbum();
  if (typeof raw !== 'object' || raw === null) return init;
  const r = raw as Record<string, unknown>;
  return {
    discovered:
      typeof r['discovered'] === 'object' && r['discovered'] !== null
        ? (r['discovered'] as AlbumState['discovered'])
        : {},
    endowedGranted: r['endowedGranted'] === true,
    review:
      typeof r['review'] === 'object' && r['review'] !== null
        ? (r['review'] as AlbumState['review'])
        : {},
  };
}

/** کشف یک کارت (پس از حل معما یا هدیه). idempotent — کشف دوباره، golden را ارتقا می‌دهد اما تنزل نمی‌دهد. */
export function discoverCard(
  state: AlbumState,
  cardId: string,
  puzzleNumber: number,
  golden = false,
): { state: AlbumState; isNew: boolean } {
  const existing = state.discovered[cardId];
  if (existing) {
    if (golden && !existing.golden) {
      return {
        state: {
          ...state,
          discovered: { ...state.discovered, [cardId]: { ...existing, golden: true } },
        },
        isNew: false,
      };
    }
    return { state, isNew: false };
  }
  const entry = golden ? { puzzleNumber, golden: true } : { puzzleNumber };
  return {
    state: {
      ...state,
      discovered: { ...state.discovered, [cardId]: entry },
      review: {
        ...state.review,
        // مرور اول: فردا (فاصله‌ی ۱ روز)
        [cardId]: { stage: 0, nextDue: puzzleNumber + REVIEW_INTERVALS[0], lastReviewed: puzzleNumber },
      },
    },
    isNew: true,
  };
}

/**
 * پیشرفت اعطاشده: در اولین ورود به گنجینه، ۳ کارت اول رایگان کشف می‌شوند.
 * @param firstCardIds سه شناسه‌ی اول آلبوم CultureApi (به ترتیب)
 */
export function grantEndowedCards(
  state: AlbumState,
  firstCardIds: readonly string[],
  todayPuzzleNumber: number,
): { state: AlbumState; granted: string[] } {
  if (state.endowedGranted) return { state, granted: [] };
  let s: AlbumState = { ...state, endowedGranted: true };
  const granted: string[] = [];
  for (const id of firstCardIds.slice(0, ENDOWED_CARDS)) {
    const r = discoverCard(s, id, todayPuzzleNumber);
    if (r.isNew) granted.push(id);
    s = { ...r.state, endowedGranted: true };
  }
  return { state: s, granted };
}

/** کارت‌های موعد مرور امروز — قدیمی‌ترین موعدها اول (حداکثر REVIEW_BATCH) */
export function dueReviews(state: AlbumState, todayPuzzleNumber: number): string[] {
  return Object.entries(state.review)
    .filter(([id, r]) => state.discovered[id] !== undefined && r.nextDue <= todayPuzzleNumber)
    .sort((a, b) => a[1].nextDue - b[1].nextDue || a[1].lastReviewed - b[1].lastReviewed)
    .slice(0, REVIEW_BATCH)
    .map(([id]) => id);
}

/** ثبت مرور یک کارت — مرحله جلو می‌رود، فاصله‌ی بعدی افزایشی است */
export function markReviewed(
  state: AlbumState,
  cardId: string,
  todayPuzzleNumber: number,
): AlbumState {
  const current = state.review[cardId];
  if (!current || state.discovered[cardId] === undefined) return state;
  const nextStage = Math.min(current.stage + 1, REVIEW_INTERVALS.length - 1);
  const interval = REVIEW_INTERVALS[nextStage] as number;
  const next: ReviewState = {
    stage: nextStage,
    nextDue: todayPuzzleNumber + interval,
    lastReviewed: todayPuzzleNumber,
  };
  return { ...state, review: { ...state.review, [cardId]: next } };
}

/** شمارنده‌ی «۳۴ از ۳۰۰» */
export function albumProgress(state: AlbumState, total: number): { discovered: number; total: number } {
  return { discovered: Object.keys(state.discovered).length, total };
}
