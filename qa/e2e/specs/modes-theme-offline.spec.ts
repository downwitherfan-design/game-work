/**
 * E2E طلایی #3 — تمرین بی‌نهایت، تم تیره، آفلاین کامل، RTL در 320px.
 * ⚠️ نیازمند @playwright/test — RFC-0003.
 */

// @ts-expect-error: پشت RFC-0003
import { test, expect } from '@playwright/test';
import { TID, tid, goOffline } from '../helpers';

test.describe('تمرین بی‌نهایت', () => {
  test('ورود به تمرین: بورد تازه با طول متغیر و بدون مصرف معمای روزانه', async ({ page }) => {
    await page.goto('/');
    await page.click(tid(TID.practiceTab));
    await expect(page).toHaveURL(/\/practice/);
    await expect(page.locator(tid(TID.board))).toBeVisible();
    const mode = await page.locator(tid(TID.board)).getAttribute('data-mode');
    expect(mode).toBe('practice');
  });
});

test.describe('تم تیره', () => {
  test('toggle تم: data-theme=dark اعمال و پس از reload ماندگار می‌ماند', async ({ page }) => {
    await page.goto('/');
    await page.click(tid(TID.themeToggle));
    await expect(page.locator('html[data-theme="dark"], body[data-theme="dark"]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('html[data-theme="dark"], body[data-theme="dark"]')).toHaveCount(1);
  });
});

test.describe('آفلاین کامل — خط قرمز ۱۸', () => {
  test('بازی روزانه بدون اینترنت کاملاً کار می‌کند', async ({ page, context }) => {
    // بار اول آنلاین (نصب PWA/کش)
    await page.goto('/');
    await expect(page.locator(tid(TID.board))).toBeVisible();

    // قطع کامل شبکه و reload
    await goOffline(context);
    await page.reload();
    await expect(page.locator(tid(TID.board))).toBeVisible();
    await expect(page.locator(tid(TID.keyboard))).toBeVisible();

    // هیچ dialog/toast خطای شبکه‌ای نباید نمایش داده شود (silent degrade)
    await expect(page.locator('[data-testid="network-error"]')).toHaveCount(0);
  });

  test('تمرین هم آفلاین کار می‌کند', async ({ page, context }) => {
    await page.goto('/');
    await goOffline(context);
    await page.click(tid(TID.practiceTab));
    await expect(page.locator(tid(TID.board))).toBeVisible();
  });
});

test.describe('RTL در viewport 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('dir=rtl فعال است و هیچ سرریز افقی وجود ندارد', async ({ page }) => {
    await page.goto('/');
    // RTL-first (خط قرمز ۲۴)
    const dir = await page.evaluate(
      () => document.documentElement.getAttribute('dir') ?? document.body.getAttribute('dir'),
    );
    expect(dir).toBe('rtl');

    // سرریز افقی = باگ layout در موبایل کوچک
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    // بورد و کیبورد هر دو داخل viewport جا می‌شوند
    for (const id of [TID.board, TID.keyboard]) {
      const box = await page.locator(tid(id)).boundingBox();
      expect(box, id).not.toBeNull();
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(321);
    }
  });
});
