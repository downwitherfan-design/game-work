/**
 * @dordaneh/qa — پیکربندی Playwright برای E2E سناریوهای طلایی.
 * ⚠️ اجرا نیازمند devDependency «@playwright/test» است — RFC-0003 (در انتظار AI-14).
 * تا تأیید، specها کامل نوشته شده‌اند و با نصب وابستگی بلافاصله اجرا می‌شوند:
 *   npm run test:e2e -w @dordaneh/qa
 *
 * baseURL: خروجی build شده‌ی app-shell (vite preview روی پورت 4173) —
 * CI (AI-14) قبل از این مرحله «npm run build:app && vite preview» را بالا می‌آورد.
 */

// @ts-expect-error: @playwright/test پشت RFC-0003 — تایپ‌ها پس از نصب فعال می‌شوند
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.DOR_BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // فارسی/تهران — محیط واقعی کاربر هدف
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
  },
  projects: [
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 5'] }, // نماینده‌ی WebView اندروید
    },
    {
      name: 'mobile-small-320',
      use: {
        ...devices['Galaxy S5'], // سخت‌ترین مرز: viewport 320px
        viewport: { width: 320, height: 640 },
      },
    },
    {
      name: 'desktop-web',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.DOR_BASE_URL
    ? undefined
    : {
        command: 'npm run build:app --prefix ../.. && npx vite preview --port 4173 --strictPort',
        cwd: '../packages/app-shell',
        port: 4173,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
