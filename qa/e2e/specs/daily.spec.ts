/**
 * E2E طلایی #2 — معمای روزانه: برد، باخت، ماندگاری state وسط بازی،
 * و مرز نیمه‌شب تهران (پرریسک‌ترین باگ محصول: puzzleNumber و استریک).
 * ⚠️ نیازمند @playwright/test — RFC-0003.
 */

// @ts-expect-error: پشت RFC-0003
import { test, expect } from '@playwright/test';
import { TID, tid, typeGuess, mockClock, T } from '../helpers';

/**
 * قرارداد با AI-05/06 برای تست‌پذیری:
 *  - window.__DOR_TEST__?.getDailyAnswer(): string  (فقط در بیلد dev/test)
 *  - data-puzzle-number روی game-board
 * اگر hook تست موجود نبود، تست‌های وابسته skip می‌شوند (نه fail) تا CI فاز ۰ سبز بماند.
 */
async function getDailyAnswer(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(() => {
    const w = window as unknown as { __DOR_TEST__?: { getDailyAnswer(): string } };
    return w.__DOR_TEST__?.getDailyAnswer() ?? null;
  });
}

test.describe('معمای روزانه', () => {
  test('برد: حدس جواب → مودال برد + استریک +۱', async ({ page }) => {
    await mockClock(page, T.midOfPuzzle812);
    await page.goto('/');
    const answer = await getDailyAnswer(page);
    test.skip(!answer, 'hook تست __DOR_TEST__ هنوز توسط AI-05 پیاده نشده');

    await typeGuess(page, answer as string);
    await expect(page.locator(tid(TID.winModal))).toBeVisible();
    await expect(page.locator(tid(TID.streakBadge))).toContainText('۱');
  });

  test('باخت: ۶ حدس اشتباه → مودال باخت + نمایش جواب', async ({ page }) => {
    await mockClock(page, T.midOfPuzzle812);
    await page.goto('/');
    const answer = await getDailyAnswer(page);
    test.skip(!answer, 'hook تست __DOR_TEST__ هنوز پیاده نشده');

    // ۶ حدس معتبرِ غیرجواب — قرارداد: __DOR_TEST__.getValidNonAnswers(6)
    const wrongs = await page.evaluate(() => {
      const w = window as unknown as {
        __DOR_TEST__?: { getValidNonAnswers(n: number): string[] };
      };
      return w.__DOR_TEST__?.getValidNonAnswers(6) ?? null;
    });
    test.skip(!wrongs, 'hook getValidNonAnswers هنوز پیاده نشده');

    for (const wGuess of wrongs as string[]) await typeGuess(page, wGuess);
    await expect(page.locator(tid(TID.loseModal))).toBeVisible();
    await expect(page.locator(tid(TID.loseModal))).toContainText(answer as string);
  });

  test('state ماندگار: بستن وسط بازی و بازگشت — حدس‌ها حفظ می‌شوند', async ({ page }) => {
    await mockClock(page, T.midOfPuzzle812);
    await page.goto('/');
    const answer = await getDailyAnswer(page);
    test.skip(!answer, 'hook تست هنوز پیاده نشده');

    const wrongs = await page.evaluate(() => {
      const w = window as unknown as {
        __DOR_TEST__?: { getValidNonAnswers(n: number): string[] };
      };
      return w.__DOR_TEST__?.getValidNonAnswers(2) ?? null;
    });
    test.skip(!wrongs, 'hook هنوز پیاده نشده');

    for (const g of wrongs as string[]) await typeGuess(page, g);

    // «بستن» = reload کامل (شبیه kill شدن اپ)
    await page.reload();
    // دو ردیف اول باید پر باشند
    const filledRows = page.locator(`${tid(TID.tileRow)}[data-state="evaluated"]`);
    await expect(filledRows).toHaveCount(2);
  });

  test('🌙 مرز نیمه‌شب تهران: puzzleNumber عوض می‌شود و بردِ دیروز، امروزِ تازه را قفل نمی‌کند', async ({
    page,
  }) => {
    // قبل از نیمه‌شب
    await mockClock(page, T.beforeMidnight812);
    await page.goto('/');
    const numBefore = await page
      .locator(tid(TID.board))
      .getAttribute('data-puzzle-number');
    test.skip(!numBefore, 'data-puzzle-number هنوز توسط AI-06 پیاده نشده');

    // بعد از نیمه‌شب (reload با ساعت جدید — شبیه بازکردن اپ فردا صبح)
    await mockClock(page, T.afterMidnight812);
    await page.reload();
    const numAfter = await page
      .locator(tid(TID.board))
      .getAttribute('data-puzzle-number');

    expect(Number(numAfter)).toBe(Number(numBefore) + 1);
    // بورد روز جدید باید خالی باشد
    await expect(
      page.locator(`${tid(TID.tileRow)}[data-state="evaluated"]`),
    ).toHaveCount(0);
  });

  test('🔥 استریک در مرز نیمه‌شب درست عمل می‌کند: برد امروز + برد فردا = ۲', async ({ page }) => {
    await mockClock(page, T.midOfPuzzle812);
    await page.goto('/');
    const a1 = await getDailyAnswer(page);
    test.skip(!a1, 'hook تست هنوز پیاده نشده');
    await typeGuess(page, a1 as string);
    await expect(page.locator(tid(TID.streakBadge))).toContainText('۱');

    // فردا
    await mockClock(page, T.afterMidnight812);
    await page.reload();
    const a2 = await getDailyAnswer(page);
    await typeGuess(page, a2 as string);
    await expect(page.locator(tid(TID.streakBadge))).toContainText('۲');
  });
});
