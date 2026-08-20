import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/d1-types.ts'], // فقط تایپ — کد اجرایی ندارد
      thresholds: { lines: 80, functions: 80, statements: 80 },
    },
  },
});
