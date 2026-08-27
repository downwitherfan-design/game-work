// @dordaneh/qa — پیکربندی vitest.
// فقط تست‌های واحد/قرارداد (contract-tests/*.test.ts) اینجا اجرا می‌شوند؛
// E2E زیر qa/e2e (فایل‌های spec.ts) مال Playwright است و از vitest حذف شده
// (تا قبل از تأیید RFC-0003، وابستگی @playwright/test نصب نیست).

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['contract-tests/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
