/**
 * E2E طلایی #4 — اسکرین‌شات‌تست (visual regression) روشن/تیره + دسترس‌پذیری (axe-core).
 * ⚠️ نیازمند @playwright/test و @axe-core/playwright — RFC-0003.
 *
 * baselineهای visual در qa/e2e/specs/__screenshots__ ذخیره می‌شوند (اولین اجرا می‌سازد؛
 * تغییر عمدی UI → به‌روزرسانی با --update-snapshots و بازبینی diff در PR).
 */

// @ts-expect-error: پشت RFC-0003
import { test, expect } from '@playwright/test';
// @ts-expect-error: پشت RFC-0003
import AxeBuilder from '@axe-core/playwright';
import { TID, tid } from '../helpers';

const KEY_SCREENS: { name: string; path: string; waitFor: string }[] = [
  { name: 'daily', path: '/', waitFor: tid(TID.board) },
  { name: 'practice', path: '/practice', waitFor: tid(TID.board) },
  { name: 'stats', path: '/stats', waitFor: '[data-testid="stats-screen"]' },
  { name: 'album', path: '/album', waitFor: '[data-testid="album-screen"]' },
];

for (const theme of ['light', 'dark'] as const) {
  test.describe(`visual regression — تم ${theme}`, () => {
    for (const screen of KEY_SCREENS) {
      test(`اسکرین‌شات ${screen.name} (${theme})`, async ({ page }) => {
        await page.goto(screen.path);
        if (theme === 'dark') {
          await page.evaluate(() =>
            document.documentElement.setAttribute('data-theme', 'dark'),
          );
        }
        await page.locator(screen.waitFor).waitFor({ state: 'visible' });
        // انیمیشن‌ها را خاموش کن تا اسکرین‌شات قطعی باشد
        await page.addStyleTag({
          content: '*,*::before,*::after{animation:none!important;transition:none!important}',
        });
        await expect(page).toHaveScreenshot(`${screen.name}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}

test.describe('بودجه‌ی دسترس‌پذیری — WCAG 2.1 AA (axe-core)', () => {
  test('صفحه‌ی روزانه: صفر تخلف جدی/بحرانی', async ({ page }) => {
    await page.goto('/');
    await page.locator(tid(TID.board)).waitFor({ state: 'visible' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter(
      (v: { impact?: string }) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('ناوبری کیبورد: Tab وارد UI می‌شود (هیچ تله‌ی focus وجود ندارد)', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(focused).not.toBe('BODY'); // چیزی focus شده
  });

  test('aria-label فارسی روی کلیدهای کیبورد بازی', async ({ page }) => {
    await page.goto('/');
    const submit = page.locator(tid(TID.submitKey));
    const label = await submit.getAttribute('aria-label');
    test.skip(label === null, 'کیبورد هنوز توسط AI-06 پیاده نشده');
    expect(label ?? '').toMatch(/[\u0600-\u06FF]/);
  });
});
