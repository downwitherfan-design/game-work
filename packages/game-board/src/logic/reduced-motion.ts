/**
 * احترام به prefers-reduced-motion (خط قرمز #27 + دسترس‌پذیری).
 * جداشده برای تست‌پذیری: matchMedia تزریق‌پذیر است.
 */

export interface MatchMediaLike {
  (query: string): { matches: boolean };
}

/** آیا کاربر کاهش حرکت را ترجیح می‌دهد؟ (ایمن در محیط بدون DOM) */
export function prefersReducedMotion(matchMedia?: MatchMediaLike): boolean {
  const mm =
    matchMedia ??
    (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { matchMedia?: MatchMediaLike }).matchMedia === 'function'
      ? (globalThis as { matchMedia?: MatchMediaLike }).matchMedia
      : undefined);
  if (!mm) return false;
  try {
    return mm('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
