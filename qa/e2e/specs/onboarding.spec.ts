/**
 * E2E طلایی #1 — آنبوردینگ: پیروزی ۳۰ثانیه‌ای → کارت فرهنگی → اشتراک (کلیپ‌بورد).
 * خطوط قرمز ۱۳ و ۱۷: هیچ تبلیغی در جلسه‌ی اول؛ لذت در ۳۰ ثانیه‌ی اول.
 * ⚠️ نیازمند @playwright/test — RFC-0003.
 */

// @ts-expect-error: پشت RFC-0003
import { test, expect } from '@playwright/test';
import { TID, tid, typeGuess, readClipboard } from '../helpers';

test.describe('آنبوردینگ — پیروزی ۳۰ثانیه‌ای', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('کاربر تازه: آنبوردینگ → برد → کارت فرهنگی → اشتراک، همه زیر ۳۰ ثانیه', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/');

    // کاربر تازه باید آنبوردینگ ببیند
    await expect(page.locator(tid(TID.onboarding))).toBeVisible();

    // معمای آسان دست‌چین: جواب باید همان‌جا قابل‌کشف/راهنمایی‌شده باشد.
    // قرارداد با AI-05: عنصر data-onboarding-answer روی onboarding، جوابِ نمایشی را دارد.
    const answer = await page
      .locator(tid(TID.onboarding))
      .getAttribute('data-onboarding-answer');
    expect(answer).toBeTruthy();

    await typeGuess(page, answer as string);

    // برد + کارت فرهنگی (قانون قله-پایان)
    await expect(page.locator(tid(TID.winModal))).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(tid(TID.cultureCard))).toBeVisible();

    // کارت باید منبع (source) نمایش دهد — خط قرمز ۳۰
    await expect(page.locator(tid(TID.cultureCard))).toContainText(/منبع|—/);

    // اشتراک → کلیپ‌بورد assert
    await page.click(tid(TID.shareButton));
    await expect(page.locator(tid(TID.shareToast))).toBeVisible();
    const clip = await readClipboard(page);
    expect(clip).toContain('دُردانه');
    expect(clip).toMatch(/[🟩🟨⬜]/u);
    // بی‌اسپویلر: جواب در متن اشتراک نباشد
    expect(clip).not.toContain(answer as string);

    // کل سفر زیر ۳۰ ثانیه (خط قرمز ۱۷) — با بافر CI: ۴۵s
    expect(Date.now() - t0).toBeLessThan(45_000);
  });

  test('جلسه‌ی اول: هیچ تبلیغ/درخواست خریدی نمایش داده نمی‌شود (خط قرمز ۱۳)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid*="ad"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="paywall"]')).toHaveCount(0);
  });

  test('هیچ درخواست ثبت‌نام/لاگینی وجود ندارد (خط قرمز ۱۴)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  });
});
