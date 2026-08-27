/**
 * دیپ‌لینک‌های دعوت + لینک‌های اشتراک مستقیم کانال‌ها.
 * تلگرام مهم‌ترین کانال ایران است — دکمه‌ی مستقیم t.me/share همیشه موجود.
 */

import { toPersianDigits, type PuzzleState } from '@dordaneh/contracts';

export const DEFAULT_BASE_URL = 'https://dordaneh.app';

/**
 * دیپ‌لینک دعوت:
 *   duel   → https://dordaneh.app/d/<duelId>
 *   circle → https://dordaneh.app/c/<circleId>
 * در native با Capacitor App Links باز می‌شود (پیکربندی native: AI-14؛
 * مستندات URL scheme در README همین پکیج).
 */
export function buildInviteLinkUrl(
  kind: 'circle' | 'duel',
  id: string,
  baseUrl: string = DEFAULT_BASE_URL,
): string {
  const path = kind === 'duel' ? 'd' : 'c';
  return `${baseUrl.replace(/\/+$/, '')}/${path}/${encodeURIComponent(id)}`;
}

/** لینک اشتراک مستقیم تلگرام */
export function telegramShareUrl(text: string, url?: string): string {
  const u = new URL('https://t.me/share/url');
  // t.me الزاماً پارامتر url می‌خواهد؛ اگر لینک جدا نداریم، دامنه را می‌گذاریم
  u.searchParams.set('url', url ?? DEFAULT_BASE_URL);
  u.searchParams.set('text', text);
  return u.toString();
}

/** لینک اشتراک مستقیم واتساپ */
export function whatsappShareUrl(text: string): string {
  const u = new URL('https://wa.me/');
  u.searchParams.set('text', text);
  return u.toString();
}

/**
 * متن دعوت دوئل با چالش شخصی — شکاف کنجکاوی
 * (Loewenstein, Psychology of Curiosity, 1994):
 * «من ۳ حدسه زدم؛ تو می‌تونی؟»
 */
export function duelChallengeText(
  state: Pick<PuzzleState, 'status' | 'guesses'>,
  templates: { won: (count: string) => string; lost: string },
): string {
  if (state.status === 'won') {
    return templates.won(toPersianDigits(state.guesses.length));
  }
  return templates.lost;
}
