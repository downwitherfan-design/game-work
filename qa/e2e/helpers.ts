/**
 * @dordaneh/qa — کمکی‌های مشترک E2E.
 * ⚠️ نیازمند @playwright/test (RFC-0003).
 *
 * قرارداد selectorها با مالکان UI (AI-05/06/07/08):
 * ما فقط از `data-testid`های زیر استفاده می‌کنیم — تغییرشان شکستن E2E است؛
 * اگر مالک پکیج نام دیگری گذاشت، همین فایل تنها نقطه‌ی تطبیق است (page-object سبک).
 */

// @ts-expect-error: پشت RFC-0003
import type { Page, BrowserContext } from '@playwright/test';

/** testidهای مورد انتظار — قرارداد QA با مالکان UI */
export const TID = {
  board: 'game-board',
  keyboard: 'fa-keyboard',
  keyPrefix: 'key-', // key-ا ، key-ب ، ...
  submitKey: 'key-submit',
  backspaceKey: 'key-backspace',
  tileRow: 'tile-row', // tile-row-0 .. tile-row-5
  winModal: 'win-modal',
  loseModal: 'lose-modal',
  cultureCard: 'culture-card',
  shareButton: 'share-button',
  shareToast: 'share-toast',
  streakBadge: 'streak-badge',
  onboarding: 'onboarding',
  themeToggle: 'theme-toggle',
  practiceTab: 'nav-practice',
  statsTab: 'nav-stats',
} as const;

export function tid(id: string): string {
  return `[data-testid="${id}"]`;
}

/** تایپ یک کلمه با کیبورد درون-بازی و ثبت آن */
export async function typeGuess(page: Page, word: string): Promise<void> {
  for (const ch of Array.from(word)) {
    await page.click(tid(`${TID.keyPrefix}${ch}`));
  }
  await page.click(tid(TID.submitKey));
}

/**
 * mock ساعت: بازی را در لحظه‌ی مشخصی از زمان تهران قرار می‌دهد.
 * برای تست مرز نیمه‌شب: نیمه‌شب تهران = 20:30:00Z (تهران UTC+3:30، بدون DST از ۲۰۲۲).
 */
export async function mockClock(page: Page, isoUtc: string): Promise<void> {
  await page.clock.install({ time: new Date(isoUtc) });
}

/** جلو بردن ساعت mock شده */
export async function advanceClock(page: Page, ms: number): Promise<void> {
  await page.clock.fastForward(ms);
}

/** قطع کامل شبکه (تست آفلاین-اول — خط قرمز ۱۸) */
export async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}

/** خواندن متن کلیپ‌بورد (برای assert اشتراک) */
export async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

/** لحظه‌های مرجع زمانی برای mock (معمای ۸۱۲ و مرز روز بعدش) */
export const T = {
  /** وسط روزِ معمای ۸۱۲ به‌وقت تهران */
  midOfPuzzle812: '2028-11-20T08:00:00.000Z',
  /** یک دقیقه مانده به نیمه‌شب تهرانِ پایان روز ۸۱۲ */
  beforeMidnight812: '2028-11-20T20:29:00.000Z',
  /** یک دقیقه بعد از نیمه‌شب — شروع معمای ۸۱۳ */
  afterMidnight812: '2028-11-20T20:31:00.000Z',
} as const;
